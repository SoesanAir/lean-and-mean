// Live verification of the DEPLOYED coach-read Edge Function over HTTP.
//
// Creates two throwaway users (A with realistic workout data + a PAT, B with a
// PAT and no data), calls the deployed API, verifies responses, cross-user
// isolation, error handling and revocation, then cleans up its rows.
// Side effect per run: two throwaway auth users remain. No secrets in this file.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash, randomBytes, randomUUID } from "node:crypto";

function env() {
  const out = {};
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"#]*)"?\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}
const { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: KEY } = env();
const FN = `${URL_}/functions/v1/coach-read`;

let passed = 0, failed = 0;
const check = (name, ok, extra = "") => {
  if (ok) { passed++; console.log(`PASS  ${name}`); }
  else { failed++; console.log(`FAIL  ${name}${extra ? ` — ${extra}` : ""}`); }
};

const mk = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const newToken = () => `lnm_${randomBytes(32).toString("base64url")}`;
const sha256 = (s) => createHash("sha256").update(s).digest("hex");

async function call(token, path, method = "GET") {
  const res = await fetch(`${FN}${path}`, {
    method,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, body };
}

// today's date the same way the API computes it (Asia/Jerusalem)
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
const now = new Date().toISOString();

// ---------- user A: realistic data + token ----------
const A = mk();
const upA = await A.auth.signUp({ email: `lm-coach-a-${Date.now()}@example.org`, password: randomBytes(12).toString("base64url") });
check("A: account created", !upA.error && !!upA.data.session, upA.error?.message);

const note = (text) => ({ id: randomUUID(), text, createdAt: now, updatedAt: now });
const snapshot = {
  day: 1, name: "HARD STRENGTH", intensity: "HARD", emphasis: "QUALITY",
  goal: "test", quote: "Strong reps. No garbage reps.",
  sections: [
    {
      id: "d1-s3", type: "STRAIGHT_SETS", title: "CLEAN + STRICT PRESS",
      prescriptions: [{ id: "d1-clean-press", kind: "SETS", exerciseId: "clean-strict-press", grip: "HANDLE", sets: 2, reps: 5, perSide: true, weightKg: 16 }],
    },
    {
      id: "d6-s1", type: "EMOM", title: "MAIN EMOM", minutes: 3, blockWeightKg: 16,
      pattern: [{ id: "d6-cp", kind: "TIMED_MOVEMENT", exerciseId: "clean-strict-press", grip: "HANDLE", reps: 6 }],
    },
  ],
};
const performance = {
  workoutNote: note("Shoulder felt good."),
  sections: [
    {
      sectionId: "d1-s3",
      exercises: [{
        prescriptionId: "d1-clean-press",
        sets: [
          { setIndex: 0, completed: true, actualRepsLeft: 5, actualRepsRight: 5, note: note("16 kg felt easy.") },
          { setIndex: 1, completed: true, actualRepsLeft: 5, actualRepsRight: 4 },
        ],
      }],
    },
    {
      sectionId: "d6-s1",
      timedBlock: {
        completed: true, completedMinutes: 3, timer: { status: "finished", elapsedBeforePauseMs: 0 },
        cycles: [
          { index: 0, label: "MIN 1 — Clean + Strict Press", completed: true },
          { index: 1, label: "MIN 2 — Clean + Strict Press", completed: true, note: note("grip failed on final set") },
          { index: 2, label: "MIN 3 — Clean + Strict Press", completed: true },
        ],
        note: note("EMOM smooth."),
      },
    },
  ],
};
const sessionId = randomUUID();
const insSession = await A.from("workout_sessions").insert({
  id: sessionId, date: today, day: 1, started_at: now, finished_at: now,
  prescription_snapshot: snapshot, performance, quote: snapshot.quote,
  difficulty: "HARD", energy: 4, pain: false, updated_at: now,
});
check("A: finished session inserted for today", !insSession.error, insSession.error?.message);
const insLog = await A.from("daily_logs").upsert({ date: today, weight_kg: 82.4, note: note("slept badly"), updated_at: now }, { onConflict: "user_id,date" });
check("A: daily log inserted", !insLog.error, insLog.error?.message);

const tokenA = newToken();
const insTok = await A.from("coach_tokens").insert({ name: "live-test", token_hash: sha256(tokenA) }).select("id").single();
check("A: token created", !insTok.error, insTok.error?.message);

// plaintext never stored
const tokRow = await A.from("coach_tokens").select("token_hash").eq("id", insTok.data.id).single();
check("DB stores sha256 hash only (64 hex, != plaintext)", /^[0-9a-f]{64}$/.test(tokRow.data.token_hash) && tokRow.data.token_hash !== tokenA);

// ---------- API: today / day ----------
const t = await call(tokenA, "/today");
const session = t.body?.data?.sessions?.[0];
const cpSets = session?.sections?.find((s) => s.id === "d1-s3")?.exercises?.[0];
check("/today → 200 with metadata envelope", t.status === 200 && t.body?.version === "v1" && !!t.body?.generatedAt);
check("/today has today's completed session", session?.status === "completed" && session?.date === today);
check("/today set 1 = 5L/5R with note '16 kg felt easy.'", cpSets?.sets?.[0]?.actualRepsLeft === 5 && cpSets?.sets?.[0]?.note === "16 kg felt easy.");
check("/today shows weight 16 + grip HANDLE", cpSets?.prescription?.weightKg === 16 && cpSets?.prescription?.grip === "HANDLE");
check("/today EMOM block weight + cycle note", session?.sections?.find((s) => s.id === "d6-s1")?.blockWeightKg === 16 && session?.sections?.find((s) => s.id === "d6-s1")?.result?.cycleNotes?.[0]?.note === "grip failed on final set");
check("/today includes feedback + workout note", session?.feedback?.difficulty === "HARD" && session?.workoutNote === "Shoulder felt good.");
check("/today includes daily log with note", t.body?.data?.dailyLog?.weightKg === 82.4 && t.body?.data?.dailyLog?.note === "slept badly");

const d = await call(tokenA, `/day?date=${today}`);
check("/day?date=today matches /today", d.status === 200 && d.body?.data?.sessions?.[0]?.id === sessionId);
const dBad = await call(tokenA, "/day?date=29-08-2026");
check("/day invalid date → 400", dBad.status === 400);
const dEmpty = await call(tokenA, "/day?date=2020-01-01");
check("/day empty date → 200 with empty data", dEmpty.status === 200 && dEmpty.body?.data?.sessions?.length === 0 && dEmpty.body?.data?.dailyLog === null);

// ---------- API: week ----------
const w = await call(tokenA, "/week");
check("/week → completed count + today's summary present", w.status === 200 && w.body?.data?.workoutsCompleted >= 1 && w.body?.data?.days?.some((x) => x.date === today && x.sessions?.[0]?.completionPercent !== undefined));
check("/week notes include set note", w.body?.data?.notes?.some((n) => n.text === "16 kg felt easy."));

// ---------- API: GPT flow — resolve name → id → history ----------
const find = await call(tokenA, "/exercises?query=clean%20press");
const resolved = find.body?.data?.exercises?.find((e) => e.performed);
check("/exercises 'clean press' resolves to clean-strict-press", find.status === 200 && resolved?.exerciseId === "clean-strict-press", JSON.stringify(find.body?.data?.exercises?.map((e) => e.exerciseId)));
check("/exercises entry carries lastPerformed + sessionsCount", resolved?.lastPerformed === today && resolved?.sessionsCount === 1);
const findAmp = await call(tokenA, "/exercises?query=" + encodeURIComponent("C&P"));
check("/exercises 'C&P' alias resolves", findAmp.body?.data?.exercises?.some((e) => e.exerciseId === "clean-strict-press"));
const findAll = await call(tokenA, "/exercises");
check("/exercises without query lists only performed exercises", findAll.status === 200 && findAll.body?.data?.exercises?.length === 1 && findAll.body?.data?.exercises?.[0]?.performed === true);
const findUnknown = await call(tokenA, "/exercises?query=zercher%20yoke");
check("/exercises unknown name → empty list", findUnknown.status === 200 && findUnknown.body?.data?.exercises?.length === 0);
const findUntrained = await call(tokenA, "/exercises?query=pull-up");
check("/exercises untrained library exercise → performed=false", findUntrained.body?.data?.exercises?.some((e) => e.exerciseId === "pull-up" && e.performed === false));
const findLongQ = await call(tokenA, "/exercises?query=" + "x".repeat(200));
check("/exercises over-long query → 400", findLongQ.status === 400);
const followUp = await call(tokenA, `/exercise-history?exerciseId=${resolved?.exerciseId}`);
check("GPT flow: history via resolved id returns real results", followUp.status === 200 && followUp.body?.data?.entries?.length >= 2);

// ---------- API: exercise history ----------
const h = await call(tokenA, "/exercise-history?exerciseId=clean-strict-press");
const contexts = (h.body?.data?.entries ?? []).map((e) => e.context).join(" | ");
check("/exercise-history finds straight-sets entry (16 kg)", h.status === 200 && h.body?.data?.entries?.some((e) => e.prescription?.weightKg === 16 && e.sets?.length === 2));
check("/exercise-history finds EMOM entry with block weight", contexts.includes("16 kg block"));
const hBad = await call(tokenA, "/exercise-history");
check("/exercise-history without exerciseId → 400", hBad.status === 400);
const hLim = await call(tokenA, "/exercise-history?exerciseId=clean-strict-press&limit=1");
check("/exercise-history limit=1 respected", hLim.body?.data?.entries?.length === 1);

// ---------- API: recent notes ----------
const n = await call(tokenA, "/recent-notes");
const texts = (n.body?.data?.notes ?? []).map((x) => x.text);
check("/recent-notes includes contextual notes", n.status === 200 && texts.includes("16 kg felt easy.") && texts.includes("grip failed on final set") && texts.includes("slept badly"));
check("/recent-notes contexts name the exercise", n.body?.data?.notes?.find((x) => x.text === "16 kg felt easy.")?.context?.includes("Clean + Strict Press"));
const n1 = await call(tokenA, "/recent-notes?limit=1");
check("/recent-notes limit=1 respected", n1.body?.data?.notes?.length === 1);
const nHuge = await call(tokenA, "/recent-notes?limit=99999");
check("/recent-notes huge limit capped (no error)", nHuge.status === 200 && (nHuge.body?.data?.notes?.length ?? 0) <= 100);

// ---------- API: photos (signed URLs) ----------
// tiny 1x1 red PNG
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const photoPath = `${upA.data.user.id}/${randomUUID()}.png`;
const upPhoto = await A.storage.from("food-photos").upload(photoPath, PNG_BYTES, { contentType: "image/png" });
check("A: test photo uploaded to private bucket", !upPhoto.error, upPhoto.error?.message);
const foodIns = await A.from("food_entries").insert({ ts: now, description: "test meal", meal_type: "LUNCH", protein_g: 42, photo_path: photoPath }).select("id").single();
check("A: food entry with photo inserted", !foodIns.error, foodIns.error?.message);

const ph = await call(tokenA, "/photos");
const photo = ph.body?.data?.photos?.[0];
check("/photos → 200 with the photo record", ph.status === 200 && photo?.id === foodIns.data?.id && photo?.type === "food");
check("/photos includes metadata (description, mealType, protein)", photo?.description === "test meal" && photo?.mealType === "LUNCH" && photo?.proteinG === 42);
check("/photos imageUrl is HTTPS + has expiry metadata", typeof photo?.imageUrl === "string" && photo.imageUrl.startsWith("https://") && Boolean(photo?.imageExpiresAt) && ph.body?.data?.imageUrlTtlSeconds === 600);
check("/photos imageUrl does not expose the service key", !ph.body || !JSON.stringify(ph.body).includes(KEY) === true);

const img = await fetch(photo.imageUrl);
const imgBytes = new Uint8Array(await img.arrayBuffer());
check("signed URL downloads the exact image (bytes match)", img.status === 200 && imgBytes.length === PNG_BYTES.length && Buffer.compare(Buffer.from(imgBytes), PNG_BYTES) === 0);
check("signed URL serves image content-type", (img.headers.get("content-type") ?? "").startsWith("image/"));

const publicTry = await fetch(`${URL_}/storage/v1/object/public/food-photos/${photoPath}`);
check("bucket is NOT public (unsigned access rejected)", publicTry.status >= 400);

check("/photos?date=today includes it", (await call(tokenA, `/photos?date=${today}`)).body?.data?.photos?.length === 1);
check("/photos?date=2020-01-01 → empty", (await call(tokenA, "/photos?date=2020-01-01")).body?.data?.photos?.length === 0);
check("/photos?type=food works", (await call(tokenA, "/photos?type=food")).body?.data?.photos?.length === 1);
check("/photos?type=progress → 400 (only food exists)", (await call(tokenA, "/photos?type=progress")).status === 400);
check("/photos?date=bad → 400", (await call(tokenA, "/photos?date=31-08-2026")).status === 400);
check("/photos limit respected", (await call(tokenA, "/photos?limit=1")).body?.data?.photos?.length === 1);

// ---------- API: method / route / auth errors ----------
check("POST → 405", (await call(tokenA, "/today", "POST")).status === 405);
check("unknown route → 404", (await call(tokenA, "/everything")).status === 404);
check("no auth header → 401", (await call(null, "/today")).status === 401);
const basic = await fetch(`${FN}/today`, { headers: { Authorization: "Basic abc123" } });
check("malformed auth header → 401", basic.status === 401);

// ---------- isolation: user B must never see A's data ----------
const B = mk();
const upB = await B.auth.signUp({ email: `lm-coach-b-${Date.now()}@example.org`, password: randomBytes(12).toString("base64url") });
check("B: account created", !upB.error && !!upB.data.session, upB.error?.message);
const tokenB = newToken();
await B.from("coach_tokens").insert({ name: "live-test-b", token_hash: sha256(tokenB) });

const bFind = await call(tokenB, "/exercises");
check("isolation /exercises: B has no performed exercises", bFind.status === 200 && bFind.body?.data?.exercises?.length === 0);
const bPhotos = await call(tokenB, "/photos");
check("isolation /photos: B sees zero photos (cannot infer A's exist)", bPhotos.status === 200 && bPhotos.body?.data?.photos?.length === 0);
for (const path of ["/today", `/day?date=${today}`, "/week", "/exercises?query=clean%20press", "/exercise-history?exerciseId=clean-strict-press", "/recent-notes", "/photos"]) {
  const r = await call(tokenB, path);
  const raw = JSON.stringify(r.body);
  check(`isolation ${path}: B sees none of A's data`, r.status === 200 && !raw.includes("16 kg felt easy") && !raw.includes("Shoulder felt good") && !raw.includes(sessionId) && !raw.includes(photoPath));
}

// ---------- last_used_at + revocation ----------
const used = await A.from("coach_tokens").select("last_used_at").eq("id", insTok.data.id).single();
check("token last_used_at recorded", Boolean(used.data?.last_used_at));
await A.from("coach_tokens").update({ revoked_at: new Date().toISOString() }).eq("id", insTok.data.id);
check("revoked token → 401", (await call(tokenA, "/today")).status === 401);

// ---------- cleanup ----------
const c0 = await A.storage.from("food-photos").remove([photoPath]);
const c1 = await A.from("workout_sessions").delete().eq("user_id", upA.data.user.id);
const c2 = await A.from("daily_logs").delete().eq("user_id", upA.data.user.id);
const c2b = await A.from("food_entries").delete().eq("user_id", upA.data.user.id);
const c3 = await A.from("coach_tokens").delete().eq("user_id", upA.data.user.id);
const c4 = await B.from("coach_tokens").delete().eq("user_id", upB.data.user.id);
check("cleanup complete (incl. storage object)", ![c0, c1, c2, c2b, c3, c4].some((r) => r.error));
await A.auth.signOut(); await B.auth.signOut();

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
