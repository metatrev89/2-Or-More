-- 0002: design-pass additions (July 12, 2026)
-- 1) Mood check-ins after sessions  2) Quiet hours on schedules
-- 3) Social layer (follows, feed, comments, per-format share settings)

-- ── Mood check-ins ───────────────────────────────────────────────────
-- experience_events.kind already free-text; moods get their own table for
-- clean mood-vs-practice analytics (0 disconnected · 1 aligning · 2 aligned).
create table mood_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_kind text not null,               -- home | audio | movie
  mood smallint not null check (mood between 0 and 2),
  occurred_at timestamptz not null default now()
);
create index idx_moods_user on mood_checkins (user_id, occurred_at);

-- ── Quiet hours ──────────────────────────────────────────────────────
alter table schedules
  add column quiet_start time not null default '22:00',
  add column quiet_end time not null default '07:00';

-- ── Social graph (follow/follow-back model per the design) ───────────
create table follows (
  follower_id uuid not null references profiles(id) on delete cascade,
  followee_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id)
);
create index idx_follows_followee on follows (followee_id);

-- Per-affirmation, per-format sharing (design: text/audio/video/rings toggles)
create table share_settings (
  affirmation_id uuid not null references affirmations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  format text not null check (format in ('text', 'audio', 'video', 'rings')),
  shared boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (affirmation_id, format)
);

-- Feed events: creations/edits + experiences, published per privacy settings
create table feed_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,                        -- created_affirmation | session_ring | daily_ring | medal
  affirmation_id uuid references affirmations(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_feed_user on feed_events (user_id, created_at desc);

-- Positive-only interactions: affirms (no dislikes exist) + comments
create table feed_affirms (
  event_id uuid not null references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table feed_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references feed_events(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  hidden_at timestamptz,                     -- moderation hook (positive-only policy)
  created_at timestamptz not null default now()
);
create index idx_comments_event on feed_comments (event_id, created_at);

-- ── RLS ──────────────────────────────────────────────────────────────
alter table mood_checkins enable row level security;
alter table follows enable row level security;
alter table share_settings enable row level security;
alter table feed_events enable row level security;
alter table feed_affirms enable row level security;
alter table feed_comments enable row level security;

create policy "own moods" on mood_checkins for all using (auth.uid() = user_id);
create policy "own follows" on follows for all using (auth.uid() = follower_id);
create policy "see followers" on follows for select using (auth.uid() = followee_id);
create policy "own shares" on share_settings for all using (auth.uid() = user_id);
create policy "own feed events" on feed_events for all using (auth.uid() = user_id);
-- Followers can read events whose owner shared the relevant format:
create policy "followed feed" on feed_events for select using (
  exists (select 1 from follows f where f.follower_id = auth.uid() and f.followee_id = feed_events.user_id)
);
create policy "affirm as self" on feed_affirms for all using (auth.uid() = user_id);
create policy "read affirms" on feed_affirms for select using (true);
create policy "comment as self" on feed_comments for all using (auth.uid() = user_id);
create policy "read comments" on feed_comments for select using (hidden_at is null);
