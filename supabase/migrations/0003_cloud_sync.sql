-- 0003_cloud_sync — Supabase becomes the source of truth (cloud persistence milestone).

-- Last-write-wins concurrency metadata. The client sets updated_at on every push;
-- merge logic compares these across devices (documented in docs/product-plan.md).
alter table public.workout_sessions
  add column if not exists updated_at timestamptz not null default now();

alter table public.daily_logs
  add column if not exists updated_at timestamptz not null default now();

-- Daily log free-text note, stored as the app's Note object {id, text, createdAt, updatedAt}.
alter table public.daily_logs
  add column if not exists note jsonb;

-- Safety: at most one active (unfinished) workout session per user.
create unique index if not exists one_active_session_per_user
  on public.workout_sessions (user_id)
  where finished_at is null;

-- One logical daily log per user per date (required by upsert on conflict).
create unique index if not exists daily_logs_user_date_key
  on public.daily_logs (user_id, date);
