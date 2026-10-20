-- Oblique Play: daily document, leaderboard, milestones and diagnostic leads.

-- 1. Daily document: one document a day, the same for every player.
-- Recorded as a review attempt with shift 0 and the day's date, once per
-- player per day. It counts towards the streak, not towards shifts completed.
alter table public.review_attempts drop constraint review_attempts_shift_check;
alter table public.review_attempts add constraint review_attempts_shift_check check (shift between 0 and 6);
alter table public.review_attempts add column daily_date date;
alter table public.review_attempts add constraint review_attempts_daily_check
  check ((shift = 0) = (daily_date is not null));
create unique index review_one_daily_per_day on public.review_attempts (player_id, daily_date) where shift = 0;

create or replace function public.review_attempt_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
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
      where a.player_id = p.id and a.completed_at is not null and a.shift between 1 and 6
    ),
    best_scores = case
      when new.shift = 0 then p.best_scores
      else p.best_scores || jsonb_build_object(key, greatest(coalesce((p.best_scores ->> key)::int, 0), new.score))
    end
  where p.id = new.player_id;
  perform public.touch_streak(new.player_id);
  return new;
end;
$$;

-- 2. Quiz leaderboard. Names follow each player's choice: their display
-- name, or their random anonymous name. Ranked by total score over the
-- period (scored rounds only), then by total time. Returns the top rows
-- plus the asking player's own row.
create or replace function public.quiz_leaderboard(p_track text, p_from date, p_to date, p_limit int, p_me uuid)
returns table (rank bigint, name text, score bigint, time_ms bigint, rounds bigint, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  with totals as (
    select
      a.player_id,
      case when p.leaderboard_mode = 'name' and p.display_name is not null then p.display_name else p.anonymous_name end as name,
      sum(a.score)::bigint as score,
      sum(a.time_ms)::bigint as time_ms,
      count(*)::bigint as rounds
    from public.quiz_attempts a
    join public.players p on p.id = a.player_id
    where a.scored and a.completed_at is not null and a.track = p_track and a.set_date between p_from and p_to
    group by a.player_id, p.leaderboard_mode, p.display_name, p.anonymous_name
  ),
  ranked as (
    select t.*, rank() over (order by t.score desc, t.time_ms asc) as rank from totals t
  )
  select r.rank, r.name, r.score, r.time_ms, r.rounds, r.player_id = p_me as is_me
  from ranked r
  where r.rank <= p_limit or r.player_id = p_me
  order by r.rank, r.name;
$$;

revoke all on function public.quiz_leaderboard(text, date, date, int, uuid) from public, anon, authenticated;

-- 3. Milestones: shareable streak cards (7, 30, 100 days) and the
-- certificate for completing all six shifts. Made only by the server, after
-- checking the player has earned it.
create table public.milestones (
  code text primary key check (code ~ '^[A-Za-z0-9]{8}$'),
  player_id uuid not null references public.players (id) on delete cascade,
  kind text not null check (kind in ('streak', 'certificate')),
  value int not null,
  name text check (char_length(name) <= 40),
  created_at timestamptz not null default now(),
  unique (player_id, kind, value),
  check ((kind = 'streak' and value in (7, 30, 100)) or (kind = 'certificate' and value = 6))
);
alter table public.milestones enable row level security;
revoke all on public.milestones from anon, authenticated;

-- 4. Diagnostic leads: when a player taps "Book a free diagnostic".
-- Synced to HubSpot so the team sees who asked.
alter table public.players add column diagnostic_clicked_at timestamptz;
