-- Sign-in with LinkedIn.
--
-- With email sign-in, a new player's details (where they came from, who
-- invited them, when they accepted the terms, the marketing tick) travel
-- with the sign-up and the player record is created with them. With
-- LinkedIn the account arrives from LinkedIn without those details, so the
-- game hands them over straight after sign-in by calling this function.
--
-- It only fills in a brand-new player (created in the last 10 minutes, with
-- nothing played and no source or referrer yet), so an existing player can
-- never be re-attributed to a different referrer. Returns true when the
-- details were applied. Only the server may call it (players and visitors are
-- refused below; the server's own role keeps its access).

create or replace function public.apply_signup_details(
  p_player uuid,
  p_source text,
  p_referred_by text,
  p_terms_at timestamptz,
  p_marketing boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  applied boolean;
begin
  update public.players p
  set
    source = coalesce(nullif(left(p_source, 40), ''), 'direct'),
    referred_by = (
      select r.id from public.players r
      where r.id <> p_player
        and (r.id::text = p_referred_by or r.invite_code = lower(p_referred_by))
      limit 1
    ),
    terms_accepted_at = coalesce(least(p_terms_at, now()), p.terms_accepted_at)
  where p.id = p_player
    and p.created_at > now() - interval '10 minutes'
    and p.source = 'direct'
    and p.referred_by is null
    and p.last_played_on is null;
  applied := found;

  -- A tick in the marketing box is consent given today, new player or not.
  if coalesce(p_marketing, false) then
    update public.players set marketing_consent = true where id = p_player and not marketing_consent;
  end if;

  return applied;
end;
$$;

revoke all on function public.apply_signup_details(uuid, text, text, timestamptz, boolean) from public, anon, authenticated;
