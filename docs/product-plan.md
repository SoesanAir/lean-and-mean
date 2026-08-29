# Lean & Mean — Product Plan (V1 vertical slice)

Source of truth for requirements: the Master Prompt (spec). This document records
architecture, data model, UI/UX system design, and decisions made during Milestone 1.

## 1. What V1 is

A mobile-first PWA training cockpit used *during* the workout:

- Today screen → today's prescribed workout (Week 1, 7 days, navigable for testing).
- Log sets one-handed: check ✅, adjust actual reps, add free-text notes anywhere.
- Timed blocks (EMOM/AMRAP) with working timers and one-weight-per-block rule.
- Aggressive autosave; closing/reloading the app never loses state.
- Finish flow (difficulty 😴👍🔥☠️, energy, soreness, pain, notes) → immutable session record.
- Completed workouts viewable afterwards exactly as performed.
- Daily log (weight, waist, steps, sleep, energy, soreness, protein, calories, note).

## 2. Architecture

```
src/
  app/                    Next.js App Router pages (thin)
    page.tsx              Today (day 1–7 navigation, active session)
    history/[id]/         Completed workout view
    log/                  Daily log
    progress/             Minimal progress (streak, completed sessions, benchmark list)
  components/             UI components (design-system/MASTER.md vocabulary)
  lib/
    types.ts              Domain model (single source of truth for shapes)
    seed/                 Exercise library + Week 1 program (TypeScript constants)
    session/              Snapshot builder, session store, autosave
    coach/                Service layer (pure functions) for future /api/coach/* + MCP
supabase/
  migrations/             Full SQL schema (grip enum, notes, snapshots, daily, food)
  seed.sql                Exercise library + Week 1 template seed
docs/                     This plan + decisions
design-system/            MASTER.md design tokens & rules
```

### Key decisions (spec §32: decide, document, continue)

1. **Local-first storage in V1.** No Supabase credentials exist in this environment, and the
   spec's acceptance test is about *never losing mid-workout state*. The data layer is a small
   repository (`lib/session/store.ts`) persisting to `localStorage` synchronously on every
   mutation (the most aggressive autosave possible). The full Supabase schema, migrations,
   seed SQL and client module ship in this milestone; wiring the repository to Supabase (with
   local cache as offline buffer) is the recommended next milestone once env keys are provided.
   Nothing in the UI knows where data is stored, so the swap is contained.
2. **Templates are TypeScript constants in V1.** Week 1 is seeded both as TS constants (used by
   the running app) and as SQL seed (for the database). Editing templates in-app is out of scope.
3. **Snapshot-on-start.** Starting a workout deep-copies the day's template into a
   `WorkoutSession` document. All logging mutates only the session. Templates are never
   mutated; finished sessions are frozen (spec §23).
4. **One weight per timed block is enforced structurally.** Timed sections carry
   `blockWeightKg` at section level; exercises inside a timed section have *no weight field at
   all* (type-level prevention), only grips. A runtime validator + tests back this up.
5. **Sessions are keyed by date + day number.** One active session at a time. Reopening the app
   with an unfinished session resumes it exactly.
6. **Notes are first-class.** A single `Note` shape `{ id, text, createdAt, updatedAt }`
   attached at workout / section / exercise / set / timed-block-cycle / skill / daily-log levels,
   mirrored by the `notes` table with typed parent references in SQL.

## 3. Database model (implemented in supabase/migrations)

- `grip_type` enum: `HANDLE | HORNS | BALL | BOTTOM_UP_HANDLE | BODYWEIGHT | NONE`
- `exercises` — library incl. future (pull-ups, rings) with `is_available` flag; cues,
  common mistakes, purpose, default grip + grip_notes.
- `workout_templates`, `template_sections`, `template_prescriptions` — the future.
  Sections have `section_type` (`STRAIGHT_SETS | EMOM | AMRAP | FLOW | SKILL | INTERVAL`),
  timed sections carry `block_weight_kg`; prescriptions carry per-exercise weight only for
  non-timed sections, plus `grip_type`, `grip_notes`, sets/reps/side/duration/tempo.
- `workout_sessions` — `prescription_snapshot jsonb` (immutable copy at start),
  `performance jsonb`, difficulty/energy/soreness/pain fields, `finished_at`.
- `notes` — one table, nullable typed parent keys (workout_session_id, section_result_id, …,
  daily_log_id, food_entry_id) + CHECK exactly-one-parent.
- `daily_logs` — weight/waist/steps/sleep/energy/soreness/protein/calories per date.
- `food_entries` + Supabase Storage bucket `food-photos`.

## 4. UI/UX systems design (ui-ux-systems-designer deliverables)

### 4.1 Information hierarchy

| Priority | Information | Visibility | Method |
|---|---|---|---|
| Critical | Prescribed **weight** + **grip** of current exercise | Always (per card) | 40px volt numerals + adjacent GripBadge |
| Critical | Exercise name + prescription (3 × 5 / side) | Always | Card header |
| Critical | Timed block: block weight, time remaining, current minute/exercise | Always during block | BlockWeightBanner + full-width timer |
| Important | Workout completion % | Always | Sticky header ProgressBar |
| Important | Day / intensity / emphasis / quote | Always (header) | TodayHeader, IntensityChip, EmphasisBadge |
| Important | Set state (done, actual reps) | Always | SetRow |
| Useful | WATCH FOR cues, purpose | On demand | Collapsible disclosure inside card |
| Useful | Note existence | Always (compact) | Amber dot + first-line preview |
| Reference | Grip definitions, common mistakes | Hidden until asked | Tap GripBadge → sheet; "mistakes" inside disclosure |

### 4.2 Input model

| Action | Input | Feedback | Feel target |
|---|---|---|---|
| Complete a set | Tap 48px check circle (defaults actuals to prescription) | Pop animation + row dims + progress bar advances + vibrate | Satisfying, instant |
| Adjust actual reps | − / + stepper (long-press repeats) | Number ticks (tabular-nums) | Zero typing |
| Add note | "+ Add note" → inline textarea | Amber dot when saved; quiet "Saved" | Effortless, trustworthy |
| Start/pause/finish timer | Single large button | Big mono countdown; minute flash | Cockpit |
| Log timed-block result | Steppers for rounds/extra reps | Result summary line | Quick after collapse |
| Finish workout | FINISH → bottom sheet feedback form → confirm | Celebration (one moment) → history | Deliberate, final |
| Navigate days | ‹ Day › chevrons + day dots | Header swaps | Browsing, not committing |

### 4.3 Feedback language

- **Confirmation:** press states everywhere (<100ms); checks pop; autosave tick.
- **Result:** progress % recomputed on every mutation; set rows show actual vs prescribed.
- **Consequence:** section header shows n/m done; FINISH summarises completion.
- **Anticipation:** EMOM shows next exercise during last 10s; AMRAP shows time remaining color-shift in final minute.
- Channels: visual primary; optional `navigator.vibrate` haptics; no sound in V1.

### 4.4 Cognitive load

- One section expanded at a time (accordion); others show name + done count.
- During EMOM: screen shows ONLY current minute, exercise, reps, weight, grip, cycle (spec §26).
- Defaults everywhere: checking a set assumes prescription; steppers only for deviations.
- No mandatory fields anywhere in logging; daily log never nags (spec §18).

### 4.5 Accessibility

Per design-system MASTER §9: AA contrast on all tokens, 44px+ targets, labels, focus rings,
reduced-motion, color-never-alone, one-handed thumb-zone layout.

### 4.6 Onboarding

None needed for V1 (single expert user). The interface teaches itself: first-run shows Today
with Day 1 and a "Start workout" primary action.

## 5. Future (documented, not built)

Spec §29 preserved: Weeks 2–3 ballistic rows; gravedigger later; pull-up bar → pull-ups/chin-ups;
rings → dips/push-ups/rows/support holds (chest/shoulders/back/arms priority); two bells →
gorilla/renegade/double-KB. AI coach service layer exists as pure functions in `lib/coach/`;
HTTP routes + MCP deferred. Food photo AI deferred. Advanced charts deferred.
