-- Oblique Play: players, consent and Module 1 (document review) progress.
--
-- Rules this schema enforces:
--   * A player row exists only once the email address is confirmed, so
--     unverified sign-ups never reach HubSpot.
--   * Players can read their own rows and change only their name, role,
--     leaderboard choice and marketing consent.
--   * Answers and scores are written only by the server (secret key), so a
--     player can't forge a score from the browser.

-- Anonymous leaderboard names, e.g. "Swift Falcon 42".
create or replace function public.random_player_name()
returns text
language sql
volatile
set search_path = ''
as $$
  select (array['Swift','Calm','Bright','Quiet','Bold','Sharp','Steady','Keen','Clever','Brisk','Nimble','Patient'])[1 + floor(random() * 12)::int]
      || ' '
      || (array['Falcon','Oryx','Gazelle','Heron','Camel','Dolphin','Fox','Hawk','Ibex','Owl','Turtle','Lynx'])[1 + floor(random() * 12)::int]
      || ' '
      || (10 + floor(random() * 90)::int)::text;
$$;

create table public.players (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text check (char_length(display_name) between 1 and 40),
  anonymous_name text not null default public.random_player_name(),
  leaderboard_mode text not null default 'anonymous' check (leaderboard_mode in ('name', 'anonymous')),
  role text check (role in ('business_owner', 'finance_professional', 'student')),
  source text not null default 'direct',
  referred_by uuid references public.players (id) on delete set null,
  terms_accepted_at timestamptz not null default now(),
  marketing_consent boolean not null default false,
  -- When consent was last given or withdrawn.
  marketing_consent_at timestamptz,
  -- Engagement summary, kept up to date by triggers and synced to HubSpot.
  modules_played text[] not null default '{}',
  quiz_tracks_played text[] not null default '{}',
  shifts_completed int not null default 0,
  best_scores jsonb not null default '{}',
  current_streak int not null default 0,
  last_played_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create the player when the email is confirmed (by code or by link).
-- Sign-up details arrive as user metadata from the sign-in form.
create or replace function public.handle_confirmed_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if new.email_confirmed_at is null then
    return new;
  end if;

  begin
    insert into public.players (id, email, source, referred_by, terms_accepted_at, marketing_consent, marketing_consent_at)
    values (
      new.id,
      new.email,
      coalesce(nullif(left(meta ->> 'source', 40), ''), 'direct'),
      (select p.id from public.players p where p.id::text = meta ->> 'referred_by'),
      coalesce((meta ->> 'terms_accepted_at')::timestamptz, now()),
      coalesce((meta ->> 'marketing_consent')::boolean, false),
      case when coalesce((meta ->> 'marketing_consent')::boolean, false) then now() end
    )
    on conflict (id) do nothing;
  exception when others then
    -- Malformed metadata must never block a sign-in: fall back to the basics.
    insert into public.players (id, email) values (new.id, new.email) on conflict (id) do nothing;
  end;
  return new;
end;
$$;

create trigger on_auth_user_confirmed
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_confirmed_user();

-- Stamp updated_at, and the consent date whenever consent changes.
create or replace function public.players_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.marketing_consent is distinct from old.marketing_consent then
    new.marketing_consent_at := now();
  end if;
  return new;
end;
$$;

create trigger players_before_update
  before update on public.players
  for each row execute function public.players_before_update();

alter table public.players enable row level security;

create policy "Players read their own row" on public.players
  for select to authenticated using ((select auth.uid()) = id);

create policy "Players update their own row" on public.players
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

revoke all on public.players from anon;
revoke insert, update, delete on public.players from authenticated;
grant update (display_name, leaderboard_mode, role, marketing_consent) on public.players to authenticated;

-- Module 1: one row per shift attempt, one row per answered document.

create table public.review_attempts (
  id uuid primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  shift int not null check (shift between 1 and 6),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score int,
  total int,
  desk_ms int
);

create index review_attempts_player_shift on public.review_attempts (player_id, shift);

create table public.review_answers (
  attempt_id uuid not null references public.review_attempts (id) on delete cascade,
  doc_id text not null,
  correct boolean not null,
  desk_ms int not null check (desk_ms >= 0),
  answered_at timestamptz not null default now(),
  -- The first answer to each document in an attempt is the one that counts.
  primary key (attempt_id, doc_id)
);

alter table public.review_attempts enable row level security;
alter table public.review_answers enable row level security;

create policy "Players read their own attempts" on public.review_attempts
  for select to authenticated using ((select auth.uid()) = player_id);

create policy "Players read their own answers" on public.review_answers
  for select to authenticated using (
    exists (select 1 from public.review_attempts a where a.id = attempt_id and a.player_id = (select auth.uid()))
  );

revoke all on public.review_attempts, public.review_answers from anon;
revoke insert, update, delete on public.review_attempts, public.review_answers from authenticated;

-- When a shift is completed, refresh the player's engagement summary.
-- Streaks count consecutive days played, by the UAE calendar.
create or replace function public.review_attempt_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Dubai')::date;
  key text := 'shift_' || new.shift;
begin
  update public.players p
  set
    modules_played = case
      when 'document_review' = any (p.modules_played) then p.modules_played
      else array_append(p.modules_played, 'document_review')
    end,
    shifts_completed = (
      select count(distinct a.shift)
      from public.review_attempts a
      where a.player_id = p.id and a.completed_at is not null
    ),
    best_scores = p.best_scores || jsonb_build_object(key, greatest(coalesce((p.best_scores ->> key)::int, 0), new.score)),
    current_streak = case
      when p.last_played_on = today then p.current_streak
      when p.last_played_on = today - 1 then p.current_streak + 1
      else 1
    end,
    last_played_on = today
  where p.id = new.player_id;
  return new;
end;
$$;

create trigger review_attempt_completed
  after update of completed_at on public.review_attempts
  for each row
  when (old.completed_at is null and new.completed_at is not null)
  execute function public.review_attempt_completed();
