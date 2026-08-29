-- Lean & Mean — initial schema.
-- Mirrors src/lib/types.ts (domain model) and docs/product-plan.md §3.
-- Single-user app, but all user data is still RLS-scoped to auth.uid().

-- ============================================================
-- Enums
-- ============================================================

create type grip_type as enum (
  'HANDLE',
  'HORNS',
  'BALL',
  'BOTTOM_UP_HANDLE',
  'BODYWEIGHT',
  'NONE'
);

-- ============================================================
-- Exercise library (spec §14)
-- ============================================================

create table exercises (
  id              text primary key,               -- stable slug, e.g. 'goblet-squat'
  name            text not null,
  category        text not null check (category in (
                    'SKILL', 'BALLISTIC', 'SQUAT_LEGS', 'HINGE', 'PULL',
                    'PUSH', 'CORE', 'GRIP_ARMS', 'CONDITIONING'
                  )),
  equipment       text[] not null default '{}',
  is_available    boolean not null default true,  -- false until equipment arrives (spec §2)
  default_grip    grip_type not null,
  purpose         text[] not null default '{}',
  watch_for       text[] not null default '{}',
  common_mistakes text[]
);

-- ============================================================
-- Workout templates (the future; spec §16, §23)
-- ============================================================

create table workout_templates (
  id               text primary key,              -- e.g. 'day-1'
  day              integer not null unique check (day between 1 and 7),
  name             text not null,
  intensity        text not null check (intensity in ('HARD', 'MEDIUM', 'LIGHT', 'REST')),
  emphasis         text not null check (emphasis in ('SKILL', 'QUALITY', 'VOLUME', 'OUTPUT')),
  goal             text not null,
  quote            text not null,
  is_rest          boolean not null default false,
  rest_suggestions text[]
);

create table template_sections (
  id                text primary key,             -- e.g. 'd1-s1'
  template_id       text not null references workout_templates (id) on delete cascade,
  position          integer not null,             -- order within the day
  section_type      text not null check (section_type in (
                      'SKILL', 'STRAIGHT_SETS', 'CIRCUIT', 'EMOM', 'AMRAP', 'FLOW', 'INTERVAL'
                    )),
  title             text not null,
  emphasis          text check (emphasis in ('SKILL', 'QUALITY', 'VOLUME', 'OUTPUT')),
  intro             text,
  minutes           integer,                      -- SKILL duration / EMOM / AMRAP minutes
  rounds            integer,                      -- CIRCUIT / FLOW / INTERVAL rounds
  work_sec          integer,                      -- INTERVAL work seconds
  rest_sec          integer,                      -- INTERVAL rest seconds
  block_weight_kg   numeric,                      -- ONE weight for the whole timed block (spec §13); null = bodyweight block
  skill_exercise_id text references exercises (id), -- section-level exercise (SKILL and INTERVAL sections)
  track_best_hold   boolean not null default false, -- SKILL sections
  track_attempts    boolean not null default false, -- SKILL sections
  effort            text,                         -- INTERVAL, e.g. 'LIGHT effort.'
  is_benchmark      boolean not null default false,
  benchmark_label   text,
  unique (template_id, position)
);

comment on column template_sections.block_weight_kg is
  'Spec §13: ONE WEIGHT PER TIMED SECTION. Timed sections (EMOM/AMRAP/FLOW) carry the single weight for the entire block here; prescriptions inside a timed section must NOT carry their own weight_kg.';

create table template_prescriptions (
  id             text primary key,                -- e.g. 'd1-clean-press'
  section_id     text not null references template_sections (id) on delete cascade,
  position       integer not null,                -- order within the section
  exercise_id    text not null references exercises (id),
  kind           text not null check (kind in ('SETS', 'TIMED_MOVEMENT')),
  display_name   text,                            -- optional override, e.g. 'Clean + Press — 3/side'
  grip           grip_type not null,
  grip_notes     text,
  sets           integer,                         -- SETS only
  reps           text,                            -- number or range, e.g. '5', '8–12'
  per_side       boolean not null default false,
  each_direction boolean not null default false,
  duration_sec   integer,                         -- timed holds/carries (SETS)
  tempo          text,                            -- e.g. '3 seconds down'
  weight_kg      numeric,                         -- SETS only; null for bodyweight
  is_bodyweight  boolean not null default false,  -- TIMED_MOVEMENT ignores block weight (e.g. push-ups in an AMRAP)
  watch_for      text[],                          -- optional per-prescription cue override
  purpose        text[],                          -- optional per-prescription purpose override
  unique (section_id, position),

  -- CRITICAL RULE (spec §13): ONE WEIGHT PER TIMED SECTION.
  -- Movements inside a timed block (kind = 'TIMED_MOVEMENT') must never carry
  -- their own weight; the single weight lives on the parent section's
  -- block_weight_kg. Mirrors the type-level prevention in src/lib/types.ts
  -- (TimedMovement deliberately has no weight field).
  constraint timed_movement_has_no_weight
    check (kind <> 'TIMED_MOVEMENT' or weight_kg is null)
);

-- ============================================================
-- Workout sessions (what actually happened; spec §23)
-- ============================================================

create table workout_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid(),
  date                  date not null,             -- session key: date + day
  day                   integer not null check (day between 1 and 7),
  started_at            timestamptz not null default now(),
  finished_at           timestamptz,
  -- Immutable deep copy of the day template taken at start. Never mutated.
  prescription_snapshot jsonb not null,
  -- Section/exercise/set/timed-block/skill results, keyed by snapshot ids.
  performance           jsonb not null default '{}',
  quote                 text,                      -- editable per-session quote (spec §8)
  difficulty            text check (difficulty in ('TOO_EASY', 'RIGHT', 'HARD', 'TOO_HARD')),
  energy                integer check (energy between 1 and 5),
  soreness_before       integer check (soreness_before between 1 and 5),
  soreness_after        integer check (soreness_after between 1 and 5),
  pain                  boolean,
  pain_note             text,
  unique (user_id, date, day)
);

create index workout_sessions_user_date_idx on workout_sessions (user_id, date desc);

-- ============================================================
-- Daily tracking (spec §18) — declared before notes so notes can reference it
-- ============================================================

create table daily_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  date        date not null,
  weight_kg   numeric,
  waist_cm    numeric,
  steps       integer,
  sleep_hours numeric,
  energy      integer check (energy between 1 and 5),
  soreness    integer check (soreness between 1 and 5),
  protein_g   integer,
  calories    integer,
  unique (user_id, date)
);

-- ============================================================
-- Food (spec §19)
-- ============================================================

create table food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid(),
  ts          timestamptz not null default now(),
  description text,
  protein_g   integer,
  calories    integer,
  meal_type   text check (meal_type in ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  photo_path  text                                  -- path in the 'food-photos' storage bucket
);

create index food_entries_user_ts_idx on food_entries (user_id, ts desc);

-- ============================================================
-- Notes (first-class, spec §24)
-- One table; exactly one typed parent reference per note.
-- Result-level ids (section/exercise/set/timed-block/skill) are logical ids
-- inside workout_sessions.performance jsonb, so they are plain text, not FKs.
-- ============================================================

create table notes (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid(),
  text                  text not null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- typed parent keys (exactly one non-null)
  workout_session_id    uuid references workout_sessions (id) on delete cascade,
  section_result_id     text,
  exercise_result_id    text,
  set_result_id         text,
  timed_block_result_id text,
  skill_result_id       text,
  daily_log_id          uuid references daily_logs (id) on delete cascade,
  food_entry_id         uuid references food_entries (id) on delete cascade,

  constraint notes_exactly_one_parent check (
    num_nonnulls(
      workout_session_id,
      section_result_id,
      exercise_result_id,
      set_result_id,
      timed_block_result_id,
      skill_result_id,
      daily_log_id,
      food_entry_id
    ) = 1
  )
);

create index notes_workout_session_idx on notes (workout_session_id) where workout_session_id is not null;
create index notes_daily_log_idx on notes (daily_log_id) where daily_log_id is not null;
create index notes_food_entry_idx on notes (food_entry_id) where food_entry_id is not null;

-- updated_at maintenance
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger notes_set_updated_at
  before update on notes
  for each row
  execute function set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

-- Library / template tables: readable by any authenticated user, no client writes.
alter table exercises              enable row level security;
alter table workout_templates      enable row level security;
alter table template_sections      enable row level security;
alter table template_prescriptions enable row level security;

create policy "exercises are readable by authenticated users"
  on exercises for select to authenticated using (true);

create policy "templates are readable by authenticated users"
  on workout_templates for select to authenticated using (true);

create policy "template sections are readable by authenticated users"
  on template_sections for select to authenticated using (true);

create policy "template prescriptions are readable by authenticated users"
  on template_prescriptions for select to authenticated using (true);

-- User-data tables: owner-only for everything.
alter table workout_sessions enable row level security;
alter table daily_logs       enable row level security;
alter table food_entries     enable row level security;
alter table notes            enable row level security;

create policy "own workout sessions: select" on workout_sessions
  for select to authenticated using (user_id = auth.uid());
create policy "own workout sessions: insert" on workout_sessions
  for insert to authenticated with check (user_id = auth.uid());
create policy "own workout sessions: update" on workout_sessions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own workout sessions: delete" on workout_sessions
  for delete to authenticated using (user_id = auth.uid());

create policy "own daily logs: select" on daily_logs
  for select to authenticated using (user_id = auth.uid());
create policy "own daily logs: insert" on daily_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "own daily logs: update" on daily_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own daily logs: delete" on daily_logs
  for delete to authenticated using (user_id = auth.uid());

create policy "own food entries: select" on food_entries
  for select to authenticated using (user_id = auth.uid());
create policy "own food entries: insert" on food_entries
  for insert to authenticated with check (user_id = auth.uid());
create policy "own food entries: update" on food_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own food entries: delete" on food_entries
  for delete to authenticated using (user_id = auth.uid());

create policy "own notes: select" on notes
  for select to authenticated using (user_id = auth.uid());
create policy "own notes: insert" on notes
  for insert to authenticated with check (user_id = auth.uid());
create policy "own notes: update" on notes
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own notes: delete" on notes
  for delete to authenticated using (user_id = auth.uid());
