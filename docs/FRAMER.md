# Connecting obliqueconsult.com (Framer) to the game

**For:** whoever looks after the Framer site.
**You need:** edit access to the Framer project, and (once, for step 1) the DNS at Hover.
**You don't need:** to write code. Everything on the Framer side is links and Framer's built-in **Embed** component.

## How it fits together

```
 obliqueconsult.com                         play.obliqueconsult.com
 (Framer, unchanged)                        (the game: Next.js on Vercel,
                                             code in GitHub wahajsid/oblique-play)
 ┌──────────────────────────┐   links       ┌───────────────────────────────┐
 │ Menu: "Tax Game"         │ ────────────▶ │ /                 home        │
 │ Footer: "UAE Tax Game"   │               │ /quiz             daily quiz  │
 │ Buttons on service pages │               │ /spot-the-error   daily puzzle│
 │                          │   embeds      │ /prizes           prizes      │
 │ [Leaderboard box]  ◀─────┼────────────── │ /embed/leaderboard            │
 │ [Puzzle box]       ◀─────┼────────────── │ /embed/spot-the-error         │
 └──────────────────────────┘               └───────────────────────────────┘
```

- The website and the game are separate sites. The website stays on Framer exactly as it is; the game lives on its own subdomain.
- The website **links** to game pages, and **embeds** two small boxes made for it. Nothing on Framer needs updating day to day: the puzzle and the leaderboard update themselves.
- Only the two `/embed/...` boxes can be shown inside another site. Full game pages refuse to load inside a frame (sign-in breaks inside frames, and it stops other sites wrapping the game), so always **link** to them.

## Step 1. Point play.obliqueconsult.com at the game (once)

Done when the game is first deployed. Skip if https://play.obliqueconsult.com already opens the game.

1. **Vercel:** in the game's project, go to Settings, then Domains, and add `play.obliqueconsult.com`. Vercel shows a `CNAME` record, usually `cname.vercel-dns.com`.
2. **Hover:** for obliqueconsult.com, add that record: type `CNAME`, host `play`, value as Vercel shows.
3. **Don't touch** the records for `obliqueconsult.com` itself or `www`: those point at Framer, and changing them would take the website down.
4. Wait for Vercel to show the domain as valid (minutes to an hour). It issues the HTTPS certificate itself.

## Step 2. Links (menu, footer, buttons)

Add these as ordinary links in Framer. Keep the `?utm_source=website` ending: the game records it, so new players who came from the website show as "website" in HubSpot.

| Where on the site | Label (suggested) | Link to | Open in |
| --- | --- | --- | --- |
| Main menu | Tax Game | `https://play.obliqueconsult.com/?utm_source=website` | Same tab |
| Footer | UAE Tax Game | `https://play.obliqueconsult.com/?utm_source=website` | Same tab |
| Menu or a button | Spot the error | `https://play.obliqueconsult.com/spot-the-error?utm_source=website` | Same tab |
| Corporate Tax service page | Test yourself | `https://play.obliqueconsult.com/quiz/ct?utm_source=website` | Same tab |
| VAT service page | Test yourself | `https://play.obliqueconsult.com/quiz/vat?utm_source=website` | Same tab |
| Anywhere (once prizes are on) | Monthly prizes | `https://play.obliqueconsult.com/prizes?utm_source=website` | Same tab |

`/quiz/ct` and `/quiz/vat` always open that day's quiz.

## Step 3. The embed boxes

In Framer: **Insert, then Embed**. In the Embed's settings choose **URL** (not HTML) and paste the address below. Then size it.

### Leaderboard box (top 5 this month)

| Setting | Value |
| --- | --- |
| URL, dark (navy, for navy or image sections) | `https://play.obliqueconsult.com/embed/leaderboard` |
| URL, light (for white sections) | `https://play.obliqueconsult.com/embed/leaderboard?theme=light` |
| Size | Width 280 to 340, height **340** (fixed). Suits a sidebar, a corner of the homepage, or a column next to text. |
| Corner radius | The box has its own 16px rounded corners. Leave the Embed's radius at 0 and its background transparent. |
| On mobile | Same box, full width of the column, height 340. |

What it shows:
- Before launch (until 1 Dec 2026): "The leaderboard opens on 1 Dec 2026".
- After launch: the top 5 players this month by Corporate Tax and VAT quiz points, under the name each player chose (their name or a random anonymous name). Oblique staff never appear.
- In the prize months (December 2026 to February 2027, once prizes are switched on): the prize standings instead, headed "Monthly prizes · Win an iPhone or Galaxy S26".
- Numbers refresh every 5 minutes. Clicking anywhere opens the game in a new tab.

### Puzzle box (spot the error)

| Setting | Value |
| --- | --- |
| URL | `https://play.obliqueconsult.com/embed/spot-the-error` |
| Size | Width 360 to 600, height **200 to 220** (fixed). Suits a band under the homepage hero, or the VAT service page. |
| Corner radius | As above: its own 16px corners, Embed background transparent. |

It shows today's date and "Can you spot what's wrong with today's UAE tax document?". Clicking opens the puzzle in a new tab. Before launch it says the first puzzle arrives on 1 Dec 2026.

### Where these boxes may be shown

The game only lets these addresses show the boxes:

- `obliqueconsult.com`, `www.obliqueconsult.com` and any other `*.obliqueconsult.com`
- Framer's own addresses: `*.framer.app`, `*.framer.website`, `framer.com` (so they also work in Framer's editor and preview)

If you publish a staging copy of the website on any other domain, the boxes will show blank there. Ask the game's developer to add the domain to `EMBED_HOSTS` in `next.config.ts`.

## Step 4. Check it

After publishing the Framer site:

- [ ] The menu and footer links open https://play.obliqueconsult.com and the game loads.
- [ ] The leaderboard box shows on desktop and on a phone, with nothing cut off at 340 high.
- [ ] The puzzle box shows today's date (UAE time).
- [ ] Clicking each box opens the game in a new tab.
- [ ] On a phone, the boxes fit the column without sideways scrolling.

## Troubleshooting

| What you see | Why, and what to do |
| --- | --- |
| A box is blank or shows a "refused to connect" icon | The page showing it isn't on an allowed address (see above). Check the domain, or ask for it to be added. |
| A game page is blank inside an Embed | Full game pages can't be framed, by design. Use a link instead. Only the two `/embed/...` addresses work as Embeds. |
| "Opens on 1 Dec 2026" after launch | The game's clock uses UAE time; it switches at midnight UAE time on 1 Dec. If it persists, the game may not be deployed; check https://play.obliqueconsult.com. |
| The leaderboard looks a few minutes old | It refreshes every 5 minutes, on purpose, so the website never slows the game down. |
| Scrollbars inside a box | The Embed is smaller than the sizes above. Make it taller. |
| The box text is the wrong colour for the section | Use the light version (`?theme=light`) on white sections and the dark version elsewhere. |

## Optional: a short address

For a shorter address to print or say out loud, such as `puzzle.obliqueconsult.com`, no code is needed:

1. In Vercel, go to the game's project, then Settings, then Domains, and add `puzzle.obliqueconsult.com` set to **Redirect to** `https://play.obliqueconsult.com/spot-the-error`.
2. In Hover, add the `CNAME` record Vercel shows.

Use a redirect rather than a second copy of a page, so sign-in, sharing and tracking stay in one place.

## For the game's developer

- The boxes are ordinary pages: `src/app/embed/leaderboard/page.tsx` and `src/app/embed/spot-the-error/page.tsx`. Each fills whatever size it's given and has a transparent page background.
- Which sites may frame them is set in `next.config.ts` (`EMBED_HOSTS`). Every other page sends `frame-ancestors 'none'`.
- The leaderboard data comes from `getMonthlyTop` in `src/lib/quiz/leaderboard.ts`, cached for 5 minutes with no cookies read, so one database query serves every visitor.
- Before launch, set `LAUNCH_PREVIEW=true` locally to see the launched versions of the boxes and the puzzle page. Never set it in Vercel.
- To add another box: create `src/app/embed/<name>/page.tsx` (copy an existing one). The framing rules already cover everything under `/embed/`.
- Deploying: pushing to `main` on GitHub deploys to Vercel. On Vercel's Hobby plan, only commits whose author is `wahajsid@users.noreply.github.com` deploy (see `docs/SETUP.md`).
