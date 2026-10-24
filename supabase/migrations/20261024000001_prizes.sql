-- Monthly prizes and referral points.
--
-- Points for a month = correct answers in scored Corporate Tax and VAT daily
-- quizzes (the "Both" track reuses the same questions, so it doesn't count)
-- + 10 points for each friend who signed up with the player's link and
-- finished their first scored quiz that month, up to 10 friends (100 points).
-- The top 3 players who have entered win; see docs/PRIZES.md.

-- 1. Players: prize entry, staff exclusion and a short invite code.

create or replace function public.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  -- 8 characters with no look-alikes (no i, l, o, 0 or 1).
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + floor(random() * 31)::int, 1), '')
  from generate_series(1, 8);
$$;

alter table public.players
  -- When the player confirmed they meet the prize rules. Null: not entered.
  add column prize_entered_at timestamptz,
  -- Set by Oblique (never by the player) for staff, reviewers and their families.
  add column prize_excluded boolean not null default false,
  add column invite_code text not null unique default public.new_invite_code()
    check (invite_code ~ '^[a-z2-9]{8}$');

-- Anyone signing up with an Oblique email is excluded automatically.
-- Reviewers and family using other addresses are excluded by hand
-- (docs/PRIZES.md).
create or replace function public.players_exclude_staff()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if split_part(lower(new.email), '@', 2) = 'obliqueconsult.com' then
    new.prize_excluded := true;
  end if;
  return new;
end;
$$;

create trigger players_exclude_staff
  before insert on public.players
  for each row execute function public.players_exclude_staff();

update public.players set prize_excluded = true where split_part(lower(email), '@', 2) = 'obliqueconsult.com';

-- A friend's sign-up can name the referrer by player id (challenge links)
-- or by invite code (invite links).
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
      (select p.id from public.players p
        where p.id::text = meta ->> 'referred_by' or p.invite_code = lower(meta ->> 'referred_by')
        limit 1),
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

-- 2. Points.

-- One mailbox, one person: "Sara.K+2@gmail.com" and "sarak@gmail.com" both
-- become "sarak@gmail.com", so extra aliases don't count as extra friends.
create or replace function public.normalize_email(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(lower(p_email), '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(lower(p_email), '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(lower(p_email), '@', 1), '+', 1) || '@' || split_part(lower(p_email), '@', 2)
  end;
$$;

-- Every player's points between two dates (UAE calendar).
-- A referral counts in the month the friend finished their first scored
-- quiz, on any track. It doesn't count if the friend's mailbox already has
-- an earlier account, or is the referrer's own mailbox.
create or replace function public.prize_totals(p_from date, p_to date)
returns table (player_id uuid, quiz_points bigint, time_ms bigint, rounds bigint, referrals bigint, referral_points bigint, points bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with quiz as (
    select a.player_id, sum(a.score)::bigint as quiz_points, sum(a.time_ms)::bigint as time_ms, count(*)::bigint as rounds
    from public.quiz_attempts a
    where a.scored and a.completed_at is not null and a.track in ('ct', 'vat') and a.set_date between p_from and p_to
    group by a.player_id
  ),
  first_round as (
    select a.player_id, min(a.set_date) as qualified_on
    from public.quiz_attempts a
    where a.scored and a.completed_at is not null
    group by a.player_id
  ),
  first_of_mailbox as (
    select distinct on (public.normalize_email(p.email)) p.id
    from public.players p
    order by public.normalize_email(p.email), p.created_at, p.id
  ),
  refs as (
    select friend.referred_by as player_id, count(*)::bigint as referrals
    from public.players friend
    join first_round fr on fr.player_id = friend.id
    join public.players referrer on referrer.id = friend.referred_by
    where fr.qualified_on between p_from and p_to
      and friend.id in (select id from first_of_mailbox)
      and public.normalize_email(friend.email) <> public.normalize_email(referrer.email)
    group by friend.referred_by
  )
  select
    coalesce(q.player_id, r.player_id),
    coalesce(q.quiz_points, 0),
    coalesce(q.time_ms, 0),
    coalesce(q.rounds, 0),
    coalesce(r.referrals, 0),
    least(coalesce(r.referrals, 0), 10) * 10,
    coalesce(q.quiz_points, 0) + least(coalesce(r.referrals, 0), 10) * 10
  from quiz q
  full join refs r on r.player_id = q.player_id;
$$;

-- The prize board for a month (p_month is its first day): entered,
-- eligible players with at least one scored round that month. Ties go to
-- more quiz points, then less total time. Returns the top rows plus the
-- asking player's own row. Emails are included only for the admin script.
create or replace function public.prize_board(p_month date, p_limit int, p_me uuid)
returns table (
  rank bigint, player_id uuid, email text, name text, points bigint, quiz_points bigint,
  referral_points bigint, referrals bigint, rounds bigint, time_ms bigint, is_me boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  with ranked as (
    select
      t.*,
      p.email,
      case when p.leaderboard_mode = 'name' and p.display_name is not null then p.display_name else p.anonymous_name end as name,
      rank() over (order by t.points desc, t.quiz_points desc, t.time_ms asc) as rank
    from public.prize_totals(p_month, (p_month + interval '1 month' - interval '1 day')::date) t
    join public.players p on p.id = t.player_id
    where p.prize_entered_at is not null and not p.prize_excluded and t.rounds > 0
  )
  select r.rank, r.player_id, r.email, r.name, r.points, r.quiz_points, r.referral_points, r.referrals, r.rounds, r.time_ms,
    r.player_id = p_me
  from ranked r
  where r.rank <= p_limit or r.player_id = p_me
  order by r.rank, r.name;
$$;

-- 3. Winners and payments. Rows are written by `npm run prizes:close` and
-- updated by Oblique in the Supabase table editor as each winner is
-- checked and paid.
create table public.prize_awards (
  id bigint generated always as identity primary key,
  month date not null check (extract(day from month) = 1),
  place int not null check (place between 1 and 3),
  -- Kept if the player later deletes their account, as a payment record.
  player_id uuid references public.players (id) on delete set null,
  email text not null,
  board_name text not null,
  points int not null,
  amount_aed int not null check (amount_aed > 0),
  status text not null default 'contacting' check (status in ('contacting', 'verified', 'paid', 'forfeited')),
  -- Filled in by Oblique after checking ID. Bank details never go here.
  legal_name text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, player_id)
);

-- One live winner per place; a forfeited row stays as a record.
create unique index prize_awards_live_place on public.prize_awards (month, place) where status <> 'forfeited';

create or replace function public.prize_awards_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'paid' and new.paid_at is null then
    new.paid_at := now();
  end if;
  return new;
end;
$$;

create trigger prize_awards_before_update
  before update on public.prize_awards
  for each row execute function public.prize_awards_before_update();

alter table public.prize_awards enable row level security;
revoke all on public.prize_awards from anon, authenticated;

-- Only the server (secret key) calls these.
revoke all on function public.prize_totals(date, date) from public, anon, authenticated;
revoke all on function public.prize_board(date, int, uuid) from public, anon, authenticated;
