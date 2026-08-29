-- 0004_coach_tokens — personal access tokens for the read-only Coach API.
--
-- Security model: the plaintext token (format "lnm_<43 base64url chars>",
-- 32 bytes of entropy) is generated CLIENT-SIDE and shown to the user exactly
-- once; only its SHA-256 hex digest is ever stored or transmitted to Postgres.
-- The coach-read Edge Function resolves the user from the digest and scopes
-- every query to that user_id. Revocation = setting revoked_at (kept for audit).

create table public.coach_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] not null default array['coach:read'],
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

comment on table public.coach_tokens is
  'Coach API personal access tokens. token_hash = sha256 hex of the plaintext; plaintext is never stored.';

alter table public.coach_tokens enable row level security;

create policy "own coach tokens: select" on public.coach_tokens
  for select to authenticated using (user_id = auth.uid());

create policy "own coach tokens: insert" on public.coach_tokens
  for insert to authenticated with check (user_id = auth.uid());

create policy "own coach tokens: update" on public.coach_tokens
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own coach tokens: delete" on public.coach_tokens
  for delete to authenticated using (user_id = auth.uid());

create index coach_tokens_user_idx on public.coach_tokens (user_id);
