-- 2+ initial schema
-- Runs on Supabase Postgres. Auth is Supabase Auth (auth.users).
-- RLS: users see only their own rows; the worker uses the service role.

create type life_area as enum (
  'spiritual', 'financial', 'relationships', 'family', 'social', 'fitness_health', 'business'
);

create type affirmation_format as enum ('text', 'audio', 'image', 'scene_clip', 'mind_movie');

create type job_type as enum (
  'media_stage1',        -- voice clone + audio + goal images (at trial start)
  'media_stage2',        -- mind movie generation + stitch (day 2-3 / engagement signal)
  'regen_asset'          -- single-asset regeneration after user edit
);

create type job_status as enum ('queued', 'running', 'succeeded', 'failed', 'cancelled');

create type subscription_status as enum ('none', 'in_trial', 'active', 'grace', 'expired');

-- ── Profiles ─────────────────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  photo_consent_at timestamptz,            -- consent to use profile photo in image gen
  photo_storage_key text,                  -- R2 key; raw photo never leaves our storage except to image API per-request
  onboarding_completed_at timestamptz,
  timezone text not null default 'America/Denver',
  created_at timestamptz not null default now()
);

-- ── Voice (BIPA-sensitive: explicit consent + retention tracking) ───
create table voice_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  vendor text not null default 'fish_audio',
  vendor_voice_id text,                    -- id at the TTS vendor
  consent_given_at timestamptz not null,   -- REQUIRED: written consent captured in-app before sample upload
  consent_text_version text not null,      -- version of the consent copy the user agreed to
  sample_storage_key text,
  deleted_at timestamptz,                  -- soft delete; hard-delete job purges vendor + storage
  created_at timestamptz not null default now()
);

-- ── Goals & affirmations ─────────────────────────────────────────────
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  area life_area not null,
  raw_text text not null,                  -- what the user actually said
  why_text text,                           -- the captured "why"
  action_items jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table affirmations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  goal_id uuid references goals(id) on delete set null,
  statement text not null,                 -- present-tense "I am" statement
  is_identity boolean not null default false, -- eternal identity statements (US-3)
  visibility text not null default 'private', -- private | public (v2)
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Media assets (generated once, served forever) ───────────────────
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  affirmation_id uuid references affirmations(id) on delete cascade,
  format affirmation_format not null,
  storage_key text not null,               -- R2 object key
  duration_seconds numeric,
  vendor text,                             -- which model generated it (bake-off telemetry)
  generation_cost_usd numeric,             -- real COGS tracking per asset
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── Generation job queue ─────────────────────────────────────────────
create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type job_type not null,
  status job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts int not null default 0,
  max_attempts int not null default 3,
  last_error text,
  run_after timestamptz not null default now(),  -- enables the day-2 stage-2 delay
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_jobs_pickup on generation_jobs (status, run_after) where status = 'queued';

-- ── Scheduling & delivery ────────────────────────────────────────────
create table schedules (
  user_id uuid primary key references profiles(id) on delete cascade,
  plan text not null default 'prime',       -- prime | custom
  per_day int not null default 10,          -- current daily frequency
  window_start time not null default '07:00',
  window_end time not null default '22:00',
  phase_started_at timestamptz not null default now(), -- prime protocol phase tracking
  push_token text,
  updated_at timestamptz not null default now()
);

-- Every scheduled delivery + every user experience event (feeds rings/streaks, and the v2 social feed)
create table experience_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  affirmation_id uuid references affirmations(id) on delete set null,
  kind text not null,                       -- delivered | read | spoke | listened | viewed_images | watched_movie
  occurred_at timestamptz not null default now()
);
create index idx_events_user_day on experience_events (user_id, occurred_at);

-- ── Subscription state (mirrored from RevenueCat webhooks) ───────────
create table entitlements (
  user_id uuid primary key references profiles(id) on delete cascade,
  status subscription_status not null default 'none',
  product_id text,
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  updated_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table voice_profiles enable row level security;
alter table goals enable row level security;
alter table affirmations enable row level security;
alter table media_assets enable row level security;
alter table generation_jobs enable row level security;
alter table schedules enable row level security;
alter table experience_events enable row level security;
alter table entitlements enable row level security;

create policy "own profile" on profiles for all using (auth.uid() = id);
create policy "own voice" on voice_profiles for all using (auth.uid() = user_id);
create policy "own goals" on goals for all using (auth.uid() = user_id);
create policy "own affirmations" on affirmations for all using (auth.uid() = user_id);
create policy "own media" on media_assets for select using (auth.uid() = user_id);
create policy "own jobs read" on generation_jobs for select using (auth.uid() = user_id);
create policy "own schedule" on schedules for all using (auth.uid() = user_id);
create policy "own events" on experience_events for all using (auth.uid() = user_id);
create policy "own entitlements read" on entitlements for select using (auth.uid() = user_id);
-- Writes to media_assets / generation_jobs / entitlements happen via service role (worker, webhooks).
