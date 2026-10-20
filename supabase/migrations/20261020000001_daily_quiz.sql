-- Oblique Play: Module 2 (daily quiz) attempts and answers.
--
-- Rules this schema enforces:
--   * One scored attempt per player, per track, per day. Any further play of
--     the same set (a replay, or a past day from the archive) is practice.
--   * Answers and scores are written only by the server.
--   * Finishing a scored quiz, or any document shift, counts towards the
--     player's daily streak (consecutive UAE calendar days).

-- Streaks, shared by both modules.
create or replace function public.touch_streak(p_player uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Asia/Dubai')::date;
begin
  update public.players p
  set
    current_streak = case
      when p.last_played_on = today then p.current_streak
      when p.last_played_on = today - 1 then p.current_streak + 1
      else 1
    end,
    last_played_on = today
  where p.id = p_player;
end;
$$;

-- Document shifts now use the shared streak function.
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
      where a.player_id = p.id and a.completed_at is not null
    ),
    best_scores = p.best_scores || jsonb_build_object(key, greatest(coalesce((p.best_scores ->> key)::int, 0), new.score))
  where p.id = new.player_id;
  perform public.touch_streak(new.player_id);
  return new;
end;
$$;

create table public.quiz_attempts (
  id uuid primary key,
  player_id uuid not null references public.players (id) on delete cascade,
  track text not null check (track in ('ct', 'vat', 'both')),
  set_date date not null,
  scored boolean not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  score int,
  total int,
  time_ms int
);

create unique index quiz_one_scored_attempt_per_day
  on public.quiz_attempts (player_id, track, set_date)
  where scored;

create index quiz_attempts_set on public.quiz_attempts (set_date, track) where scored and completed_at is not null;

create table public.quiz_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id text not null,
  correct boolean not null,
  time_ms int not null check (time_ms >= 0),
  answered_at timestamptz not null default now(),
  -- The first answer to each question in an attempt is the one that counts.
  primary key (attempt_id, question_id)
);

alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;

create policy "Players read their own quiz attempts" on public.quiz_attempts
  for select to authenticated using ((select auth.uid()) = player_id);

create policy "Players read their own quiz answers" on public.quiz_answers
  for select to authenticated using (
    exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.player_id = (select auth.uid()))
  );

revoke all on public.quiz_attempts, public.quiz_answers from anon;
revoke insert, update, delete on public.quiz_attempts, public.quiz_answers from authenticated;

-- When a quiz is finished, note the module and track played; scored
-- attempts also count towards the streak.
create or replace function public.quiz_attempt_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.players p
  set
    modules_played = case
      when 'daily_quiz' = any (p.modules_played) then p.modules_played
      else array_append(p.modules_played, 'daily_quiz')
    end,
    quiz_tracks_played = case
      when new.track = any (p.quiz_tracks_played) then p.quiz_tracks_played
      else array_append(p.quiz_tracks_played, new.track)
    end
  where p.id = new.player_id;
  if new.scored then
    perform public.touch_streak(new.player_id);
  end if;
  return new;
end;
$$;

create trigger quiz_attempt_completed
  after update of completed_at on public.quiz_attempts
  for each row
  when (old.completed_at is null and new.completed_at is not null)
  execute function public.quiz_attempt_completed();
