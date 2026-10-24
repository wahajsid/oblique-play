# The puzzle on obliqueconsult.com (Framer)

The website stays on Framer. The puzzle lives in the game at
**play.obliqueconsult.com/spot-the-error**, and the website links to it.
Nothing on the Framer site needs updating day to day: the document changes by
itself at midnight UAE time.

## What visitors get

- Today's document, the same one game players get. Tap "Looks right" or "Something's off", then see the answer and the rule behind it, with **no sign-in**.
- Afterwards: "Play the full game", "Challenge a colleague" (share link) and "Book a free call" (Calendly, tagged `oblique-play`).
- Coming back the same day shows their result, not the puzzle again (stored on their device).
- Shared links show a preview card that never gives the answer away.
- Before launch day (3 Nov 2026) the page says when the first document arrives, so the launch-day answer stays private.

Answers from the public page aren't stored. The daily document doesn't count for prizes, so a player who tries it here first gains nothing in the game.

## Framer: three ways to link it

All links should end in `?utm_source=website`, so new players who came from the website show as "website" in HubSpot.

1. **A menu link or button** (now): add a nav link "Spot the error" (or "Tax puzzle") to
   `https://play.obliqueconsult.com/spot-the-error?utm_source=website`.
2. **A "Test yourself" box on the homepage** (later): in Framer, Insert, then **Embed**, choose **URL**, and paste
   `https://play.obliqueconsult.com/embed/spot-the-error`. Size it about 360 to 560 wide and 200 to 220 tall. It shows today's date and opens the puzzle in a new tab.
3. **Service pages:** the same Embed on the VAT page, or a button to the link in (1).

The embed box is the only part of the game that other sites may show in a frame (obliqueconsult.com and Framer's preview domains). Every other page refuses, which stops other sites wrapping the game.

## A different address, if you want one

The page works at `play.obliqueconsult.com/spot-the-error`. For a shorter address such as `puzzle.obliqueconsult.com`, no code is needed:

1. In Vercel, Project, Settings, **Domains**: add `puzzle.obliqueconsult.com` and choose **Redirect to** `play.obliqueconsult.com/spot-the-error`.
2. In Hover, add the `CNAME` record Vercel shows.

One address for the game keeps sign-in, sharing and analytics in one place, so a redirect is better than a second copy of the page.

## Later: a small leaderboard

A "top 5 this month" box for the homepage can use the same embed approach. It needs the leaderboard to be live with real players first.

## Checking the page before launch

Run the game locally with `SPOT_PREVIEW=true` to see the launch-day document on `/spot-the-error` and the live version of the embed box.
