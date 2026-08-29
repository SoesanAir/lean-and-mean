# Lean & Mean

Personal training cockpit — a dark, mobile-first PWA for kettlebell/bodyweight training,
built to be used *during* the workout, one-handed, on an iPhone.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Open http://localhost:3000 on your phone (same network: use your machine's LAN IP) or in a
~390px-wide browser viewport. Install as a PWA via Safari → Share → Add to Home Screen.

## Commands

| Command | What |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest suite (snapshotting, notes, grips, single-weight rule, timers) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Storage & sync

**Supabase is the source of truth; localStorage is the offline cache.** Sign in with
email/password (login screen); every change autosaves locally in the same tap (instant UI)
and syncs to Supabase in the background with retry — the badge in the top-right shows
Saving… / Synced / Offline / Sync failed. Open the app on another device with the same
account and the active workout, notes, history and daily logs are there. Existing local
history from the pre-cloud version is imported automatically on first sign-in (idempotent,
no duplicates). Details: `docs/product-plan.md` (decision 1) and `docs/supabase-setup.md`.

Live verification: `npm run verify:supabase`, `node scripts/test-rls-live.mjs`,
`node scripts/test-sync-live.mjs`, `node scripts/test-coach-api-live.mjs`.

## Coach Read API

Read-only HTTP API for AI coaches (`/today`, `/day`, `/week`,
`/exercise-history`, `/recent-notes`), authenticated with personal access
tokens created under Progress → Coach API access. See `docs/coach-api.md`.

## Docs

- `docs/product-plan.md` — architecture, data model, UI/UX system design, decisions
- `docs/supabase-setup.md` — Supabase project + migration + env instructions
- `design-system/MASTER.md` — design tokens and UI rules

## Screens

- **Today** (`/`) — today's workout, day 1–7 navigation, live logging, timers, finish flow
- **History** (`/history/[id]`) — immutable completed-workout view
- **Log** (`/log`) — daily metrics (weight, waist, steps, sleep, energy, soreness, protein, calories, note)
- **Progress** (`/progress`) — streak, trends, AMRAP benchmark, exercise history
