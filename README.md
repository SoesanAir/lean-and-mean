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

## Storage

V1 is **local-first**: all state autosaves synchronously to `localStorage` on every change
(sets, notes, timers, daily logs) — closing/reloading never loses a workout. The complete
Supabase schema, migrations and seed live in `supabase/`; see `docs/supabase-setup.md` for
wiring up cloud persistence (next milestone).

## Docs

- `docs/product-plan.md` — architecture, data model, UI/UX system design, decisions
- `docs/supabase-setup.md` — Supabase project + migration + env instructions
- `design-system/MASTER.md` — design tokens and UI rules

## Screens

- **Today** (`/`) — today's workout, day 1–7 navigation, live logging, timers, finish flow
- **History** (`/history/[id]`) — immutable completed-workout view
- **Log** (`/log`) — daily metrics (weight, waist, steps, sleep, energy, soreness, protein, calories, note)
- **Progress** (`/progress`) — streak, trends, AMRAP benchmark, exercise history
