# Coach Read API (V1)

A controlled, **read-only** HTTP API that lets an external AI coach (ChatGPT,
Claude, …) inspect your Lean & Mean training data. Deployed as the Supabase
Edge Function `coach-read`. No writes, no AI inside — it serves clean data;
the intelligence layer comes later.

## Endpoint

```
https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read
```

## Authentication

Personal access tokens (PAT), created in the app under
**Progress → Coach API access**. Format `lnm_<43 chars>` (32 bytes of entropy,
generated in your browser). Only the SHA-256 hash is stored — the plaintext is
shown exactly once at creation and can never be recovered, only revoked.
Revoked tokens stop working immediately. Scope: `coach:read` only.

```
Authorization: Bearer lnm_...
```

Missing/invalid/revoked token → `401` (with no hint whether an account exists).

## Routes (GET only)

| Route | Query params | Returns |
|---|---|---|
| `/today` | `tz` (optional, default `Asia/Jerusalem`) | Today's session(s) in full detail + daily log |
| `/day` | `date=YYYY-MM-DD` (required), `tz` | Same shape for any calendar day |
| `/week` | `date` (any day inside the week, default today), `tz` | Mon–Sun summaries, completion, benchmarks, daily logs, notes |
| `/exercise-history` | `exerciseId` (required, stable slug), `limit` (default 20, max 100) | Past performances incl. timed-block appearances |
| `/recent-notes` | `limit` (default 20, max 100) | Recent free-text notes with human-readable context |

Exercise ids are the stable slugs from the exercise library, e.g.
`clean-strict-press`, `kb-swing`, `goblet-squat`, `one-arm-row`, `horn-curl`,
`handstand`, `bottom-up-hold`.

All responses share the envelope:

```json
{ "version": "v1", "generatedAt": "2026-08-29T18:00:00.000Z", "data": { } }
```

Errors: `{ "version": "v1", "error": { "code": "unauthorized", "message": "…" } }`
with proper status codes (400/401/404/405/500). `Cache-Control: no-store, private`.

## Examples

```bash
curl -H "Authorization: Bearer <COACH_TOKEN>" \
  "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read/today"

curl -H "Authorization: Bearer <COACH_TOKEN>" \
  "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read/day?date=2026-08-29"

curl -H "Authorization: Bearer <COACH_TOKEN>" \
  "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read/week"

curl -H "Authorization: Bearer <COACH_TOKEN>" \
  "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read/exercise-history?exerciseId=clean-strict-press&limit=20"

curl -H "Authorization: Bearer <COACH_TOKEN>" \
  "https://qslnimyifpkzmlxlpsgv.supabase.co/functions/v1/coach-read/recent-notes?limit=20"
```

Response sketch for `/today` (fields only present when they exist):

```json
{
  "version": "v1",
  "generatedAt": "…",
  "data": {
    "date": "2026-08-29",
    "sessions": [{
      "day": 1, "name": "HARD STRENGTH", "intensity": "HARD",
      "emphasis": "QUALITY > QUANTITY", "status": "completed",
      "completion": { "done": 15, "total": 15, "percent": 100 },
      "feedback": { "difficulty": "HARD", "energy": 4, "pain": false },
      "workoutNote": "Shoulder felt good.",
      "sections": [{
        "title": "CLEAN + STRICT PRESS", "type": "STRAIGHT_SETS",
        "exercises": [{
          "prescription": { "exerciseId": "clean-strict-press", "name": "Clean + Strict Press",
                            "sets": 3, "reps": 5, "perSide": true, "weightKg": 16, "grip": "HANDLE" },
          "sets": [{ "setIndex": 1, "completed": true, "actualRepsLeft": 5,
                     "actualRepsRight": 5, "note": "16 kg felt easy." }]
        }]
      }]
    }],
    "dailyLog": { "date": "2026-08-29", "weightKg": 82.4, "note": "slept badly" }
  }
}
```

## Security model

- The Edge Function resolves the user **solely from the PAT hash** — callers
  can never supply a `user_id`.
- The service-role key exists only inside the Supabase Edge runtime (injected
  env var); it is not in the repo, frontend bundle, or responses. Because it
  bypasses RLS, every query in the function is explicitly `user_id`-scoped.
- Read-only: GET/OPTIONS only, all other methods → 405. Hard caps (`limit` ≤
  100, bounded session scans) prevent full-database dumps.
- Data interpretation is shared with the app (`src/lib/coach/shape.ts` is
  bundled into the function), and sessions are read from their immutable
  `prescription_snapshot` + `performance` — history is never reinterpreted
  with today's templates.
- Token storage: `public.coach_tokens` (owner-only RLS) holds
  `sha256(token)`, name, created/last-used/revoked timestamps. Plaintext never
  leaves your browser except in the one-time reveal.

## Token lifecycle

1. App → Progress → **Coach API access** → name it (e.g. `ChatGPT`) → GENERATE.
2. Copy the token immediately (shown once).
3. Revoke any time from the same list — takes effect on the next request.

## Verification

`node scripts/test-coach-api-live.mjs` — 38 live checks against the deployed
function: response contents, timezone-correct "today", error handling, limits,
cross-user isolation, hash-only storage, revocation.
