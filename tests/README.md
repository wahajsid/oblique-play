# Tests

Two kinds. Both print one `PASS` or `FAIL` line per check, in plain words.

| Command | What it checks | Needs |
| --- | --- | --- |
| `npm run test:db` | The database rules: who can read and change what, scoring, streaks, prizes and referrals. 65 checks. | Nothing: it runs an in-memory Postgres. A few seconds. |
| `npm run test:e2e` | The game in a real browser: sign-in, playing, fair play, lead capture, sharing, reporting, the public puzzle page. About 100 checks. | Local Supabase and a build (below). About 5 minutes. |

Both run automatically on GitHub for every push (`.github/workflows/ci.yml`), along with lint, type checks, the two content checkers and a build.

## Running the browser tests on a laptop

```bash
npx supabase start                 # needs Docker; first run downloads images
npx supabase status                # copy the URL and keys into .env.local (see .env.example),
                                   # with NEXT_PUBLIC_SITE_URL=http://localhost:3005
npx playwright install chromium    # once
npm run build
npm run test:e2e                   # or: npm run test:e2e -- fair-play   (one file)
```

The runner starts the app itself on port 3005, pinned to the first day in the quiz schedule so there is always a quiz to play, with prizes switched on. Sign-in emails go to the local test inbox at http://127.0.0.1:54324; the tests read the codes from there.

## What each file covers

| File | Covers |
| --- | --- |
| `db/players-and-review.test.mjs` | Players are created only from confirmed emails; players can't read or change each other's rows; document shifts and best scores. |
| `db/daily-quiz.test.mjs` | One scored attempt per player, track and day; streaks; practice doesn't count. |
| `db/prizes.test.mjs` | Monthly points, the referral cap, email aliases, staff exclusion, the prize board, award records. |
| `e2e/fair-play.test.mjs` | Answers can't be fetched without an account or before answering; server-side timing; no practice round while a scored round is open; the mixed quiz lock; per-player option order; the sample round. |
| `e2e/leads-and-sharing.test.mjs` | Name, role and company after a quiz; the offer matched to a weak topic; the pasteable result; link previews; certificates on LinkedIn. |
| `e2e/report-a-problem.test.mjs` | The report form in every place, its limits, and the `npm run reports` command. |
| `e2e/spot-the-error.test.mjs` | The public puzzle page, its preview image and which sites may embed the boxes. |

## Adding a test

Copy the nearest file. Use `ok(condition, "what a person would say this proves")`. A browser test that needs a signed-in player can copy the `player()` helper from `e2e/fair-play.test.mjs`.
