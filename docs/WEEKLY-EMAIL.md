# The weekly email: "3 questions most players got wrong"

One command writes it. Sending takes about 10 minutes a week.

```bash
npm run weekly:email                    # the 7 days up to yesterday (UAE time)
npm run weekly:email -- 2026-12-07      # the 7 days ending on that date
npm run weekly:email -- 2026-12-07 --min 20   # only questions at least 20 players answered (default 10)
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (from the environment or `.env.local`).

## What it does

1. Reads the week's scored quiz answers and works out, for each question, what share of players got it right.
2. Picks the three lowest. A question needs at least 10 answers (`--min`) so one unlucky player can't decide it.
3. Writes `emails/weekly-<date>.html` and `.txt`: each question with its options, then the answer, the reason and the law reference, and a "Play today's 20 questions" button. The button's link is tagged, so new sign-ups from the email show as `weekly-email` in HubSpot.
4. Prints how many players have agreed to marketing, and the hardest question worded as the Tuesday LinkedIn poll ("Only 25% of players got this one right").

The questions are from days that have already passed, so the email gives nothing away.

## Sending it (HubSpot)

1. Marketing, Email, Create email, Regular. Choose a plain template.
2. Paste the subject line the command printed.
3. Add a custom HTML block and paste the contents of the `.html` file. Replace the bracketed line near the end with one sentence about an Oblique service, or delete it.
4. Send to the list of contacts where *Oblique Play: marketing consent* is *Yes*. HubSpot adds the unsubscribe link and honours it.
5. Suggested time: Monday morning, so the Tuesday poll follows it.

Only players who ticked the marketing box receive it. Playing never depends on that box.
