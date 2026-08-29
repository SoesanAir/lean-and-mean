#!/usr/bin/env node
// Lean & Mean — read-only Supabase sanity checks.
//
// Run: npm run verify:supabase   (or: node scripts/verify-supabase.mjs)
//
// Uses the PUBLISHABLE key from .env.local and signs in ANONYMOUSLY to get the
// `authenticated` role — NOTE: this creates a throwaway anonymous auth user on
// the project each run. All database access is read-only (SELECT / storage list).
// Prints one PASS/FAIL line per check and exits 1 if any check fails.
//
// No secrets are hardcoded here; credentials come from .env.local.

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
    // strip trailing unquoted comment
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

// ---------- check harness ----------

const EXPECTED_URL = "https://qslnimyifpkzmlxlpsgv.supabase.co";
const GRIPS = ["HANDLE", "HORNS", "BALL", "BOTTOM_UP_HANDLE", "BODYWEIGHT", "NONE"];
const EXPECTED_TEMPLATES = {
  1: "HARD STRENGTH",
  2: "LIGHT CORE + ENGINE",
  3: "HARD CONDITIONING",
  4: "MEDIUM MUSCLE + STABILITY",
  5: "LIGHT SKILL + CORE + FOREARMS",
  6: "MEDIUM FULL BODY",
  7: "REST / RECOVERY",
};
const WEEK1_MUST_INCLUDE = [
  "horn-curl",
  "deep-squat-curl",
  "north-south-plank-drag",
  "bottom-up-hold",
  "ball-squeeze-hold",
];
const WEEK1_MUST_EXCLUDE = [
  "ballistic-row",
  "gorilla-row",
  "renegade-row-push-up",
  "kb-gravedigger",
  "pull-up",
  "chin-up",
  "muscle-up",
  "ring-dip",
  "ring-push-up",
  "ring-row",
];

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

function fatal(name, detail) {
  report(name, false, detail);
  console.log(`\n${passes} passed, ${failures} failed (aborted early)`);
  process.exit(1);
}

// ---------- checks ----------

const env = readEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envOk =
  url === EXPECTED_URL &&
  typeof key === "string" &&
  (key.startsWith("sb_publishable_") || key.startsWith("eyJ"));
report(
  "env config (URL + publishable key present)",
  envOk,
  `url=${url ?? "<missing>"} keyPrefix=${key ? key.slice(0, 8) + "…" : "<missing>"}`,
);
if (!envOk) fatal("cannot continue without env config", "");

console.log(
  "NOTE: signing in anonymously — this creates a throwaway anonymous auth user on the project.",
);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
report(
  "anonymous sign-in (auth reachable)",
  !authError && Boolean(authData?.user?.id),
  authError?.message,
);
if (authError) fatal("cannot continue without an authenticated session", "");
const uid = authData.user.id;

// --- exercises: count + grip coverage ---
const { data: exercises, error: exError } = await supabase
  .from("exercises")
  .select("id, default_grip, watch_for");
if (exError) {
  report("exercises readable", false, exError.message);
} else {
  report(
    "exercises count >= 37",
    exercises.length >= 37,
    `found ${exercises.length}`,
  );
}

const { data: presAll, error: presAllError } = await supabase
  .from("template_prescriptions")
  .select("id, section_id, exercise_id, kind, grip, reps, per_side, weight_kg");
if (presAllError) {
  report("template_prescriptions readable", false, presAllError.message);
}

if (!exError && !presAllError) {
  const seenGrips = new Set([
    ...exercises.map((e) => e.default_grip),
    ...presAll.map((p) => p.grip),
  ]);
  const missing = GRIPS.filter((g) => !seenGrips.has(g));
  report(
    "all 6 grip values appear (exercises.default_grip ∪ prescriptions.grip)",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : "",
  );
}

// --- workout_templates: exactly 7, days 1..7, names, quotes ---
const { data: templates, error: tplError } = await supabase
  .from("workout_templates")
  .select("id, day, name, quote");
if (tplError) {
  report("workout_templates readable", false, tplError.message);
} else {
  report("workout_templates: exactly 7 rows", templates.length === 7, `found ${templates.length}`);
  const byDay = new Map(templates.map((t) => [t.day, t]));
  const nameProblems = [];
  for (let day = 1; day <= 7; day += 1) {
    const row = byDay.get(day);
    if (!row) nameProblems.push(`day ${day} missing`);
    else if (row.name !== EXPECTED_TEMPLATES[day])
      nameProblems.push(`day ${day}: "${row.name}" != "${EXPECTED_TEMPLATES[day]}"`);
  }
  report(
    "workout_templates: days 1..7 with expected names",
    nameProblems.length === 0,
    nameProblems.join("; "),
  );
  const noQuote = templates.filter((t) => !t.quote || !String(t.quote).trim());
  report(
    "workout_templates: every template has a non-empty quote",
    noQuote.length === 0,
    noQuote.map((t) => `day ${t.day}`).join(", "),
  );
}

// --- sections (needed by several checks) ---
const { data: sections, error: secError } = await supabase
  .from("template_sections")
  .select("id, section_type, minutes, block_weight_kg, is_benchmark");
if (secError) report("template_sections readable", false, secError.message);

// --- benchmark AMRAP d3-s3 ---
if (!secError && !presAllError) {
  const d3s3 = sections.find((s) => s.id === "d3-s3");
  const secOk =
    d3s3 &&
    d3s3.section_type === "AMRAP" &&
    d3s3.minutes === 8 &&
    Number(d3s3.block_weight_kg) === 20 &&
    d3s3.is_benchmark === true;
  report(
    "benchmark AMRAP d3-s3 (AMRAP, 8 min, 20 kg block, is_benchmark)",
    Boolean(secOk),
    d3s3 ? JSON.stringify(d3s3) : "section d3-s3 not found",
  );

  const d3pres = presAll.filter((p) => p.section_id === "d3-s3");
  const expect = [
    { exercise_id: "kb-swing", reps: 8, grip: "HANDLE", per_side: false },
    { exercise_id: "goblet-squat", reps: 6, grip: "HORNS", per_side: false },
    { exercise_id: "push-up", reps: 6, grip: "BODYWEIGHT", per_side: false },
    { exercise_id: "one-arm-row", reps: 6, grip: "HANDLE", per_side: true },
  ];
  const presProblems = [];
  if (d3pres.length !== 4) presProblems.push(`expected 4 prescriptions, found ${d3pres.length}`);
  for (const e of expect) {
    const row = d3pres.find((p) => p.exercise_id === e.exercise_id);
    if (!row) presProblems.push(`${e.exercise_id} missing`);
    else if (
      Number(row.reps) !== e.reps ||
      row.grip !== e.grip ||
      Boolean(row.per_side) !== e.per_side
    )
      presProblems.push(
        `${e.exercise_id}: got reps=${row.reps} grip=${row.grip} per_side=${row.per_side}`,
      );
  }
  report(
    "benchmark AMRAP d3-s3 prescriptions (swing x8 HANDLE, goblet x6 HORNS, push-up x6 BW, row x6 HANDLE per-side)",
    presProblems.length === 0,
    presProblems.join("; "),
  );

  // --- day 6 EMOM d6-s1 ---
  const d6s1 = sections.find((s) => s.id === "d6-s1");
  const d6Ok =
    d6s1 &&
    d6s1.section_type === "EMOM" &&
    d6s1.minutes === 15 &&
    Number(d6s1.block_weight_kg) === 16;
  report(
    "day 6 EMOM d6-s1 (EMOM, 15 min, 16 kg block)",
    Boolean(d6Ok),
    d6s1 ? JSON.stringify(d6s1) : "section d6-s1 not found",
  );

  const d6pres = presAll.filter((p) => p.section_id === "d6-s1");
  const d6expect = [
    { exercise_id: "clean-strict-press", reps: 6 },
    { exercise_id: "goblet-squat", reps: 8 },
    { exercise_id: "kb-swing", reps: 10 },
  ];
  const d6Problems = [];
  if (d6pres.length !== 3) d6Problems.push(`expected 3 movements, found ${d6pres.length}`);
  for (const e of d6expect) {
    const row = d6pres.find((p) => p.exercise_id === e.exercise_id);
    if (!row) d6Problems.push(`${e.exercise_id} missing`);
    else if (Number(row.reps) !== e.reps)
      d6Problems.push(`${e.exercise_id}: reps=${row.reps}, expected ${e.reps}`);
  }
  report(
    "day 6 EMOM pattern (clean+press 6 / goblet squat 8 / swing 10)",
    d6Problems.length === 0,
    d6Problems.join("; "),
  );

  // --- single-weight rule ---
  const timedWithWeight = presAll.filter(
    (p) => p.kind === "TIMED_MOVEMENT" && p.weight_kg !== null && p.weight_kg !== undefined,
  );
  report(
    "single-weight rule: no TIMED_MOVEMENT prescription carries its own weight_kg",
    timedWithWeight.length === 0,
    timedWithWeight.map((p) => p.id).join(", "),
  );
  const timedSections = sections.filter((s) =>
    ["EMOM", "AMRAP", "FLOW"].includes(s.section_type),
  );
  const noBlockWeight = timedSections.filter(
    (s) => s.block_weight_kg === null || s.block_weight_kg === undefined,
  );
  report(
    "single-weight rule: every EMOM/AMRAP/FLOW section has block_weight_kg set",
    timedSections.length > 0 && noBlockWeight.length === 0,
    timedSections.length === 0
      ? "no timed sections found"
      : noBlockWeight.map((s) => s.id).join(", "),
  );

  // --- Week 1 include / exclude lists ---
  const usedExercises = new Set(presAll.map((p) => p.exercise_id));
  const missingIncl = WEEK1_MUST_INCLUDE.filter((id) => !usedExercises.has(id));
  report(
    "Week 1 includes horn-curl, deep-squat-curl, north-south-plank-drag, bottom-up-hold, ball-squeeze-hold",
    missingIncl.length === 0,
    missingIncl.length ? `missing: ${missingIncl.join(", ")}` : "",
  );
  const wrongExcl = WEEK1_MUST_EXCLUDE.filter((id) => usedExercises.has(id));
  report(
    "Week 1 excludes rows/pulls/rings not yet in program",
    wrongExcl.length === 0,
    wrongExcl.length ? `unexpectedly present: ${wrongExcl.join(", ")}` : "",
  );
}

// --- technique cues ---
if (!exError) {
  const noCues = exercises.filter(
    (e) => !Array.isArray(e.watch_for) || e.watch_for.length === 0,
  );
  report(
    "exercises: every exercise has non-empty watch_for cues",
    noCues.length === 0,
    noCues.map((e) => e.id).join(", "),
  );
}

// --- user-data tables reachable ---
for (const table of ["daily_logs", "food_entries", "workout_sessions", "notes"]) {
  const { error } = await supabase.from(table).select("*").limit(1);
  report(`user-data table reachable: ${table}`, !error, error?.message);
}

// --- storage: food-photos listable (user folder or root) ---
{
  const own = await supabase.storage.from("food-photos").list(uid);
  const root = own.error ? await supabase.storage.from("food-photos").list("") : null;
  const ok = !own.error || (root && !root.error);
  report(
    "storage: food-photos bucket listable (user folder or root)",
    ok,
    ok ? "" : `user folder: ${own.error?.message}; root: ${root?.error?.message}`,
  );
}

// --- anon WITHOUT session sees nothing ---
{
  const bare = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await bare.from("workout_templates").select("id").limit(5);
  const blocked = Boolean(error) || (Array.isArray(data) && data.length === 0);
  report(
    "no-session client gets zero workout_templates rows (public access blocked)",
    blocked,
    blocked ? "" : `got ${data.length} rows without a session`,
  );
}

await supabase.auth.signOut();

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures > 0 ? 1 : 0);
