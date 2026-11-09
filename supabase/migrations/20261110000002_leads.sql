-- Better leads: the player's company, and the topic they found hardest.

alter table public.players
  -- Optional, typed by the player on the profile card.
  add column company text check (char_length(company) between 1 and 80),
  -- Set by the server after each finished quiz, e.g.
  -- "Corporate Tax: Transfer pricing (1/3)". Synced to HubSpot so a
  -- follow-up can be specific.
  add column weak_topic text check (char_length(weak_topic) <= 120);

grant update (company) on public.players to authenticated;
