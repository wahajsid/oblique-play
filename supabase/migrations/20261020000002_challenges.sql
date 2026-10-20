-- Oblique Play: challenge links.
--
-- A challenge is a short code (play.obliqueconsult.com/c/AbC123xY) for one
-- finished attempt: the exact shift, or the exact day's quiz set, plus the
-- score to beat. It is created only by the server, from the creator's own
-- recorded attempt, so a challenge card can't show a made-up score.
-- A friend who plays through the link has their attempt tagged with the
-- code, which gives the side-by-side result and the acceptance metric.
-- A "rematch" is a new challenge that replies to an earlier one.

create table public.challenges (
  code text primary key check (code ~ '^[A-Za-z0-9]{8}$'),
  creator_id uuid not null references public.players (id) on delete cascade,
  -- The name on the card when it was made (null shows as "A friend").
  creator_name text check (char_length(creator_name) <= 40),
  kind text not null check (kind in ('review', 'quiz')),
  shift int check (shift between 1 and 6),
  track text check (track in ('ct', 'vat', 'both')),
  set_date date,
  -- One challenge per finished attempt; sharing again reuses it.
  attempt_id uuid not null unique,
  score int not null,
  total int not null,
  time_ms int not null,
  reply_to text references public.challenges (code) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (kind = 'review' and shift is not null and track is null and set_date is null)
    or (kind = 'quiz' and shift is null and track is not null and set_date is not null)
  )
);

create index challenges_creator on public.challenges (creator_id);

alter table public.review_attempts add column challenge_code text references public.challenges (code) on delete set null;
alter table public.quiz_attempts add column challenge_code text references public.challenges (code) on delete set null;

-- Read and written only by the server.
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;
