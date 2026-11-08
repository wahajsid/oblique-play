-- "Report a problem with this answer": reports from players and visitors
-- about a question or document. Written only by the server
-- (/api/report); read and closed by Oblique with `npm run reports`.

create table public.content_reports (
  id bigint generated always as identity primary key,
  item_id text not null check (char_length(item_id) between 1 and 40),
  item_kind text not null check (item_kind in ('question', 'document')),
  reason text not null check (reason in ('wrong_answer', 'out_of_date', 'unclear', 'other')),
  comment text check (char_length(comment) <= 1000),
  -- Only if a signed-out visitor gives it, for a reply.
  contact_email text check (char_length(contact_email) <= 200),
  player_id uuid references public.players (id) on delete set null,
  -- Where it was sent from, e.g. /quiz/vat/2026-11-17 or /spot-the-error.
  page text check (char_length(page) <= 200),
  -- A one-way hash of the sender's IP address, only to limit how many
  -- reports one device can send. The address itself isn't stored.
  ip_hash text,
  status text not null default 'new' check (status in ('new', 'fixed', 'no_change', 'duplicate')),
  resolution text check (char_length(resolution) <= 1000),
  resolved_by text check (char_length(resolved_by) <= 80),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index content_reports_open on public.content_reports (status, created_at);
create index content_reports_item on public.content_reports (item_id);
create index content_reports_sender on public.content_reports (ip_hash, created_at);

create or replace function public.content_reports_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status <> 'new' and old.status = 'new' then
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;
  return new;
end;
$$;

create trigger content_reports_before_update
  before update on public.content_reports
  for each row execute function public.content_reports_before_update();

alter table public.content_reports enable row level security;
revoke all on public.content_reports from anon, authenticated;
