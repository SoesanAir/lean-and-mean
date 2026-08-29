// Live cross-device acceptance test (spec §21) against the real Supabase project.
//
// Simulates Device A and Device B as two independent clients signed into the
// SAME email/password account (created fresh per run with a random password —
// auth autoconfirm is enabled, no email is sent). Exercises the exact contract
// the app's sync engine uses: workout_sessions rows with jsonb performance,
// daily_logs upserts on (user_id, date), the one-active-session unique index,
// and finished-session immutability. Cleans up its rows afterwards.
// Side effect per run: one throwaway auth user remains (publishable key cannot
// delete users). No secrets in this file — reads .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";

function env() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

const { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY } = env();
if (!URL_ || !KEY) {
  console.error("FAIL  .env.local missing Supabase config");
  process.exit(1);
}

const mk = () =>
  createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

let passed = 0;
let failed = 0;
function check(name, ok, extra = "") {
  if (ok) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`);
  }
}

const email = `lm-sync-${Date.now()}@example.org`;
const password = randomBytes(12).toString("base64url");
const A = mk();
const B = mk();

// ---------- device A: create account + start workout ----------
const up = await A.auth.signUp({ email, password });
check("A: create account (autoconfirm session)", !up.error && Boolean(up.data.session), up.error?.message);

const sessionId = randomUUID();
const t0 = new Date().toISOString();
const snapshot = { day: 1, name: "HARD STRENGTH", intensity: "HARD", emphasis: "QUALITY", goal: "test", quote: "Strong reps. No garbage reps.", sections: [] };
const performanceA = {
  sections: [
    {
      sectionId: "d1-s2",
      exercises: [
        {
          prescriptionId: "d1-halo",
          sets: [
            { setIndex: 0, completed: true, actualReps: 5, note: { id: randomUUID(), text: "Shoulder felt good.", createdAt: t0, updatedAt: t0 } },
            { setIndex: 1, completed: false },
          ],
        },
      ],
    },
    {
      sectionId: "d1-s3",
      exercises: [
        {
          prescriptionId: "d1-clean-press",
          sets: [
            { setIndex: 0, completed: true, actualRepsLeft: 5, actualRepsRight: 5, note: { id: randomUUID(), text: "16 kg felt easy.", createdAt: t0, updatedAt: t0 } },
            { setIndex: 1, completed: false },
            { setIndex: 2, completed: false },
          ],
        },
      ],
    },
  ],
};

const ins = await A.from("workout_sessions").insert({
  id: sessionId,
  date: t0.slice(0, 10),
  day: 1,
  started_at: t0,
  prescription_snapshot: snapshot,
  performance: performanceA,
  quote: snapshot.quote,
  updated_at: t0,
});
check("A: start workout (insert active session)", !ins.error, ins.error?.message);

// one-active-session guard
const dup = await A.from("workout_sessions").insert({
  id: randomUUID(),
  date: t0.slice(0, 10),
  day: 2,
  started_at: t0,
  prescription_snapshot: snapshot,
  performance: { sections: [] },
  updated_at: t0,
});
check("A: second active session is rejected (unique index)", dup.error?.code === "23505", dup.error ? dup.error.code : "insert unexpectedly succeeded");

// ---------- device B: sign in, see the same state ----------
const inB = await B.auth.signInWithPassword({ email, password });
check("B: sign in with same account", !inB.error, inB.error?.message);

const pullB = await B.from("workout_sessions").select("*").is("finished_at", null).maybeSingle();
const perfB = pullB.data?.performance;
const haloSet = perfB?.sections?.[0]?.exercises?.[0]?.sets?.[0];
const cpSet = perfB?.sections?.[1]?.exercises?.[0]?.sets?.[0];
check("B: sees active workout", pullB.data?.id === sessionId, pullB.error?.message);
check("B: Halo set 1 completed with note 'Shoulder felt good.'", haloSet?.completed === true && haloSet?.note?.text === "Shoulder felt good.");
check("B: Clean+Press set 1 = 5 left / 5 right with note '16 kg felt easy.'", cpSet?.actualRepsLeft === 5 && cpSet?.actualRepsRight === 5 && cpSet?.note?.text === "16 kg felt easy.");

// ---------- device B: continue + finish workout ----------
const t1 = new Date(Date.now() + 1000).toISOString();
perfB.sections[1].exercises[0].sets[1] = { setIndex: 1, completed: true, actualRepsLeft: 5, actualRepsRight: 4, note: { id: randomUUID(), text: "Right side lost lockout on fifth.", createdAt: t1, updatedAt: t1 } };
const fin = await B.from("workout_sessions").update({
  performance: perfB,
  finished_at: t1,
  difficulty: "HARD",
  energy: 4,
  pain: false,
  updated_at: t1,
}).eq("id", sessionId);
check("B: continue + finish workout", !fin.error, fin.error?.message);

// ---------- device A: reload → completed, immutable history ----------
const reloadA = await A.from("workout_sessions").select("*").eq("id", sessionId).single();
const perfA2 = reloadA.data?.performance;
check("A: workout now completed", Boolean(reloadA.data?.finished_at) && reloadA.data?.difficulty === "HARD");
check("A: history keeps set 1 note", perfA2?.sections?.[0]?.exercises?.[0]?.sets?.[0]?.note?.text === "Shoulder felt good.");
check("A: history keeps B's set 2 (5L/4R + note)", perfA2?.sections?.[1]?.exercises?.[0]?.sets?.[1]?.actualRepsRight === 4);
check("A: prescription snapshot intact", reloadA.data?.prescription_snapshot?.quote === "Strong reps. No garbage reps.");

// after finishing, a new active session is allowed again
const again = await A.from("workout_sessions").insert({
  id: randomUUID(),
  date: t0.slice(0, 10),
  day: 2,
  started_at: t1,
  prescription_snapshot: snapshot,
  performance: { sections: [] },
  updated_at: t1,
});
check("A: can start a new workout after finish", !again.error, again.error?.message);

// ---------- daily log cross-device ----------
const upA = await A.from("daily_logs").upsert({ date: t0.slice(0, 10), weight_kg: 82.4, updated_at: t0 }, { onConflict: "user_id,date" });
check("A: daily log upsert", !upA.error, upA.error?.message);
const readB = await B.from("daily_logs").select("*").eq("date", t0.slice(0, 10)).single();
check("B: sees A's daily log (82.4 kg)", Number(readB.data?.weight_kg) === 82.4, readB.error?.message);
const upB = await B.from("daily_logs").upsert({ date: t0.slice(0, 10), weight_kg: 82.4, steps: 9000, updated_at: t1 }, { onConflict: "user_id,date" });
check("B: daily log update (steps)", !upB.error, upB.error?.message);
const readA = await A.from("daily_logs").select("steps").eq("date", t0.slice(0, 10)).single();
check("A: sees B's steps (9000)", readA.data?.steps === 9000, readA.error?.message);

// ---------- cleanup ----------
const del1 = await A.from("workout_sessions").delete().eq("user_id", up.data.user.id);
const del2 = await A.from("daily_logs").delete().eq("user_id", up.data.user.id);
check("cleanup: test rows deleted", !del1.error && !del2.error);
await A.auth.signOut();
await B.auth.signOut();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
