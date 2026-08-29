#!/usr/bin/env node
// Lean & Mean — LIVE row-level-security test (run manually).
//
// Run: node scripts/test-rls-live.mjs
//
// WHAT IT DOES (small, self-cleaning write test against the live project):
//   1. Client A signs in anonymously, inserts a daily_logs row
//      { date: '1999-01-01', steps: 1 }, reads it back, then inserts a notes
//      row referencing that daily_log ('rls-test') and reads it back.
//   2. Client B (a SEPARATE client instance with its own in-memory session)
//      signs in anonymously and must NOT see A's daily_log or note, and must
//      NOT be able to update A's row (0 rows affected / error).
//   3. Storage probe: A uploads food-photos/{A_uid}/rls-test.txt; B must fail
//      to download it; A deletes it.
//   4. Client A deletes the note + daily_log (cleanup) and verifies deletion.
//
// SIDE EFFECTS: creates two throwaway anonymous auth users per run. All rows
// and storage objects it creates are deleted before exit.
//
// Node has no localStorage, so BOTH clients are constructed with
// { auth: { persistSession: false, autoRefreshToken: false } } and rely on
// in-memory sessions (signInAnonymously binds the session to that client
// instance). No secrets are hardcoded; credentials come from .env.local.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ---------- tiny .env.local reader (strips comments and quotes) ----------

function readEnvLocal() {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  const env = {};
  let raw;
  try {
    raw = readFileSync(join(root, ".env.local"), "utf8");
  } catch {
    return env;
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hash = value.indexOf(" #");
      if (hash >= 0) value = value.slice(0, hash).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

// ---------- assertion harness ----------

let failures = 0;
let passes = 0;

function report(name, ok, detail = "") {
  if (ok) {
    passes += 1;
    console.log(`PASS  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function finish(note = "") {
  if (note) console.log(note);
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures > 0 ? 1 : 0);
}

// ---------- setup: two isolated clients ----------

const env = readEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  report("env config present", false, ".env.local missing Supabase vars");
  finish();
}

const TEST_DATE = "1999-01-01";
const TEST_NOTE_TEXT = "rls-test";

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
const A = createClient(url, key, clientOptions);
const B = createClient(url, key, clientOptions);

console.log("NOTE: this run creates two throwaway anonymous auth users (A and B).\n");

const aAuth = await A.auth.signInAnonymously();
report("A: anonymous sign-in", !aAuth.error && Boolean(aAuth.data?.user?.id), aAuth.error?.message);
const bAuth = await B.auth.signInAnonymously();
report("B: anonymous sign-in", !bAuth.error && Boolean(bAuth.data?.user?.id), bAuth.error?.message);
if (aAuth.error || bAuth.error) finish("Cannot continue without both sessions.");

const aUid = aAuth.data.user.id;
const bUid = bAuth.data.user.id;
report("A and B have distinct in-memory sessions (different uids)", aUid !== bUid, `both ${aUid}`);

// ---------- A writes its test rows ----------

let logId = null;
let noteId = null;
{
  const { data, error } = await A.from("daily_logs")
    .insert({ date: TEST_DATE, steps: 1 })
    .select()
    .single();
  report("A: insert daily_logs { date: 1999-01-01, steps: 1 }", !error, error?.message);
  if (!error) logId = data.id;
}
{
  const { data, error } = await A.from("daily_logs").select("id, steps").eq("date", TEST_DATE);
  report(
    "A: reads own daily_log back (1 row)",
    !error && data?.length === 1,
    error?.message ?? `got ${data?.length} rows`,
  );
}
if (logId) {
  const { data, error } = await A.from("notes")
    .insert({ daily_log_id: logId, text: TEST_NOTE_TEXT })
    .select()
    .single();
  report("A: insert notes row referencing the daily_log", !error, error?.message);
  if (!error) noteId = data.id;

  const readBack = await A.from("notes").select("id, text").eq("text", TEST_NOTE_TEXT);
  report(
    "A: reads own note back (1 row)",
    !readBack.error && readBack.data?.length === 1,
    readBack.error?.message ?? `got ${readBack.data?.length} rows`,
  );
}

// ---------- B must be blocked by RLS ----------

{
  const { data, error } = await B.from("daily_logs").select("*").eq("date", TEST_DATE);
  report(
    "B: cannot see A's daily_log (0 rows)",
    !error && data?.length === 0,
    error?.message ?? `got ${data?.length} rows`,
  );
}
if (logId) {
  const { data, error } = await B.from("daily_logs")
    .update({ steps: 999999 })
    .eq("id", logId)
    .select();
  const blocked = Boolean(error) || (Array.isArray(data) && data.length === 0);
  report(
    "B: cannot update A's daily_log (0 rows affected / error)",
    blocked,
    blocked ? "" : `updated ${data.length} rows`,
  );
  // Double-check A's row is untouched.
  const check = await A.from("daily_logs").select("steps").eq("id", logId).single();
  report(
    "A: row value unchanged after B's update attempt",
    !check.error && check.data?.steps === 1,
    check.error?.message ?? `steps=${check.data?.steps}`,
  );
}
{
  const { data, error } = await B.from("notes").select("*").eq("text", TEST_NOTE_TEXT);
  report(
    "B: cannot see A's note (0 rows)",
    !error && data?.length === 0,
    error?.message ?? `got ${data?.length} rows`,
  );
}

// ---------- storage probe ----------

const storagePath = `${aUid}/rls-test.txt`;
{
  const { error } = await A.storage
    .from("food-photos")
    .upload(storagePath, new Blob(["rls-test"], { type: "text/plain" }), { upsert: true });
  report("A: upload food-photos/{A_uid}/rls-test.txt", !error, error?.message);

  const bDownload = await B.storage.from("food-photos").download(storagePath);
  report(
    "B: cannot download A's storage object (error expected)",
    Boolean(bDownload.error),
    bDownload.error ? "" : "B downloaded the file",
  );

  const del = await A.storage.from("food-photos").remove([storagePath]);
  const deleted = !del.error && Array.isArray(del.data) && del.data.length === 1;
  report("A: delete storage object", deleted, del.error?.message ?? `removed ${del.data?.length}`);
}

// ---------- cleanup + verify ----------

if (noteId) {
  const { error } = await A.from("notes").delete().eq("id", noteId);
  report("A: delete test note", !error, error?.message);
}
if (logId) {
  const { error } = await A.from("daily_logs").delete().eq("id", logId);
  report("A: delete test daily_log", !error, error?.message);
}
{
  const logs = await A.from("daily_logs").select("id").eq("date", TEST_DATE);
  const notes = await A.from("notes").select("id").eq("text", TEST_NOTE_TEXT);
  report(
    "A: cleanup verified (0 test rows remain)",
    !logs.error && logs.data?.length === 0 && !notes.error && notes.data?.length === 0,
    `daily_logs=${logs.data?.length ?? "err"} notes=${notes.data?.length ?? "err"}`,
  );
}

await A.auth.signOut();
await B.auth.signOut();

finish();
