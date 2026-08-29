# Supabase setup

How to stand up the Lean & Mean database. **Note:** the app currently runs
local-first (localStorage) and works without any of this — wiring the app's
repository to Supabase (cloud sync with local cache) is the next milestone.
Doing this setup now prepares the database so that milestone is a drop-in.

## 1. Create a Supabase project

1. Go to <https://supabase.com/dashboard> and sign in.
2. **New project** → pick a name (e.g. `lean-and-mean`), a strong database
   password, and a region near you.
3. Wait for provisioning to finish.

## 2. Apply the migrations

Two migrations live in `supabase/migrations/`:

- `0001_init.sql` — schema (enum, exercises, templates, sections,
  prescriptions, sessions, notes, daily logs, food entries, RLS policies).
- `0002_storage.sql` — private `food-photos` storage bucket + policies.

Apply them **either** with the CLI **or** via the dashboard.

### Option A — Supabase CLI

```bash
# one-time: install the CLI (https://supabase.com/docs/guides/cli)
npm install -g supabase

# from the repo root: C:\projects\Personal\LeanAndMean
supabase login
supabase link --project-ref <your-project-ref>   # ref is in the dashboard URL

# push all local migrations to the remote database
supabase db push
```

`supabase db push` applies every file in `supabase/migrations/` in order.
(If you run a local stack with `supabase start`, the equivalent local command
is `supabase migration up`.)

### Option B — Dashboard SQL editor (copy-paste)

1. In the dashboard, open **SQL Editor** → **New query**.
2. Paste the full contents of `supabase/migrations/0001_init.sql` → **Run**.
3. New query → paste the full contents of
   `supabase/migrations/0002_storage.sql` → **Run**.

Run them in order; `0002` is independent of `0001` but keep the numbering.

## 3. Run the seed

`supabase/seed.sql` loads the exercise library (37 exercises) and the full
Week 1 program (7 day templates, 27 sections, 36 prescriptions).

- **CLI:** `supabase db push` does not run seeds against a remote project.
  Either paste it in the SQL editor (below), or run it directly:
  `psql "<connection-string>" -f supabase/seed.sql`
  (connection string: dashboard → **Connect**). For a *local* stack,
  `supabase db reset` applies migrations + `supabase/seed.sql` automatically.
- **Dashboard:** SQL Editor → new query → paste the full contents of
  `supabase/seed.sql` → **Run**.

The seed is written for a fresh database; running it twice will fail on
duplicate primary keys (that's intentional — templates are the source of truth).

### Verify

In the SQL editor:

```sql
select count(*) from exercises;               -- expect 37
select count(*) from workout_templates;       -- expect 7
select count(*) from template_sections;       -- expect 27
select count(*) from template_prescriptions;  -- expect 36
-- one-weight-per-timed-section rule holds:
select count(*) from template_prescriptions
where kind = 'TIMED_MOVEMENT' and weight_kg is not null;  -- expect 0
```

## 4. Verify the storage bucket

Dashboard → **Storage**: you should see a **private** bucket named
`food-photos`. (Created by `0002_storage.sql`; its objects are only readable
and writable by their owner.)

## 5. Configure the app

```bash
# from the repo root
copy .env.local.example .env.local
```

Fill in both values from dashboard → **Project Settings** → **API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Restart `npm run dev` after changing `.env.local`.

## 6. Current status

- The app is **local-first**: all mid-workout logging persists synchronously to
  localStorage and nothing breaks when Supabase is unconfigured
  (`src/lib/supabase.ts` → `getSupabase()` returns `null` with a warning).
- All user-data tables have owner-only RLS (`user_id = auth.uid()`), so the
  cloud-sync milestone will also need Supabase Auth sign-in (single user).
- **Next milestone:** wire `src/lib/session/store.ts` to Supabase with the
  local cache as offline buffer.
