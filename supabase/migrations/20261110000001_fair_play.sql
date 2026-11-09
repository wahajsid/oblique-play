-- Fair play: the server times each question itself.
--
-- When a question appears on the player's screen the server notes which one
-- and when. The time for that question is then measured here, from that
-- moment to the moment its answer arrives, instead of trusting a number sent
-- by the player's device. See src/lib/quiz/record.ts.

alter table public.quiz_attempts
  add column shown_question_id text,
  add column shown_at timestamptz;

-- Used by the prize standings and the monthly points calculation.
create index if not exists quiz_attempts_player_day on public.quiz_attempts (player_id, set_date) where scored;
create index if not exists players_referred_by on public.players (referred_by) where referred_by is not null;
