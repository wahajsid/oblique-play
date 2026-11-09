# Decisions and plan corrections

Changes to the product plan (dated 20 Oct 2026), agreed 19 Oct 2026.

## Decided

| Topic | Decision |
| --- | --- |
| Launch date | **Tue 1 Dec 2026.** First planned for Tue 3 Nov (itself moved from Sun 1 Nov for LinkedIn reach), then Tue 17 Nov; moved on 8 Nov to 1 Dec so the game starts on the first day of the first prize month, with time for accounts and device testing. |
| Question bank at launch | **200 reviewed questions per track** (10 days of unique sets), then 100 new per track each week. |
| Reviewers | Corporate Tax: Ashta and Pranay. VAT (questions and all Module 1 documents): Aidarous and Arslan. |
| Leaderboard | Players choose how they appear: under their display name, or anonymously under a random name (for example "Swift Falcon 42"). |
| Arabic | English only at launch; Arabic in phase two. Build layouts so right-to-left can be added later. |
| App store versions | Phase two. |
| Build team | Wahaj and Claude only. |
| Game title | On hold. |
| Monthly prizes | **For three months (Dec 2026, Jan 2027, Feb 2027), the top 3 each month win gifts: 1st an iPhone or Galaxy S26 (winner's choice), 2nd AirPods, 3rd a power bank.** No cash prizes. Points: correct answers in the daily Corporate Tax and VAT quizzes, plus **10 per referred friend who signs up and finishes a quiz, up to 10 a month**. Winners must be UAE residents aged 18+; no staff, reviewers or their families. Hidden until the rules are legally cleared (`PRIZES_ENABLED`). See `docs/PRIZES.md`. |

## Corrected numbers (each checked twice)

**Content load.** 90 documents + 200 Corporate Tax questions + 200 VAT questions = **490 items** (the plan's 890 assumed 400 per track).

**Load per reviewer.** Reviews finish by Mon 2 Nov (day 13). Mon 19 Oct to Mon 2 Nov has **11 working days**.

| Reviewers | Items | Per reviewer | Per reviewer per working day |
| --- | --- | --- | --- |
| VAT (Aidarous, Arslan) | 200 questions + 90 documents = 290 | 145 | 145 ÷ 11 ≈ 13 |
| Corporate Tax (Ashta, Pranay) | 200 questions | 100 | 100 ÷ 11 ≈ 9 |

**Difficulty mix.** Each daily set is 5 foundation, 10 intermediate, 5 advanced (25% / 50% / 25%). So each launch bank of 200 is **50 / 100 / 50**, and each weekly batch of 100 is **25 / 50 / 25**.

**"Both" track.** 10 of each track's 20 cannot be split 2.5 / 5 / 2.5. Rule: Corporate Tax contributes 3 / 5 / 2 and VAT contributes 2 / 5 / 3, giving 5 / 10 / 5 overall.

**14-day no-repeat rule.** Days 1–10 use all 200 launch questions. The first weekly batch must be live by **quiz day 8 (Tue 8 Dec)**, or the daily set runs short on day 11 (Fri 13 Nov). With a batch every 7 days after that, a simulation never runs short.

**Midnight UAE time** is 20:00 UTC (the UAE is UTC+4 with no daylight saving). The daily job's schedule is `0 20 * * *`.

## Build schedule (as planned for 3 Nov; launch is now 1 Dec)

| Days | Dates | Work |
| --- | --- | --- |
| 1–3 | Wed 21 – Fri 23 Oct | Module 1 core, Shifts 1–3. **Done on Mon 19 Oct.** |
| 4–5 | Sat 24 – Sun 25 Oct | Email-code sign-in, Resend, consent, Supabase to HubSpot. **Code done on Mon 19 Oct; waiting on account setup (docs/SETUP.md).** |
| 6–7 | Mon 26 – Tue 27 Oct | Module 2: daily quiz. **Engine built on Tue 20 Oct; question bank in progress.** |
| 8 | Wed 28 Oct | Sharing, share cards, challenge links. **Built on Tue 20 Oct.** |
| 9 | Thu 29 Oct | Shifts 4–6, daily document, streaks, leaderboard, certificate. **Built on Tue 20 Oct.** |
| 10 | Fri 30 Oct | Polish: home-screen install, dark mode, accessibility |
| 11 | Sat 31 Oct | Device testing |
| 12–13 | Sun 1 – Mon 2 Nov | Final content sign-off, soft launch with 20–30 testers |
| 14 | Tue 3 Nov | Public launch |

## Design decisions made while building

- **Desk time counts only while a document waits for a decision.** Reading the explanation doesn't count, so players aren't punished for learning.
- **Missing items.** When something is missing (such as a supplier TRN), tapping anywhere in that section counts as finding it.
- **Tapping a field before deciding zooms in on it.** After "Something's off", tapping selects it instead.
- **Progress saves on the device after every answer.** It moves to Supabase when sign-in is built (days 4–5).
- **Scoring integrity.** Answers are checked on the server. Once sign-in exists, the server will also record each player's first answer per document, so scores can't be improved by peeking.

- **Sign-in is needed to start a shift.** The intro screen is open to everyone. (Alternative to consider: let players try the first document before signing in.)
- **The sign-in email's button opens a "Confirm sign-in" page** rather than signing in straight away, so company link scanners can't use up the code.
- **Only confirmed emails become players**, so unverified sign-ups never reach HubSpot.
- **Leaderboard names:** players start as anonymous (a random name such as "Patient Heron 57") and can switch to their display name after their first round.
- **Brand** taken from obliqueconsult.com: navy, aqua, cream paper, Satoshi, the ob/co mark.

### Daily quiz

- **Sets are picked ahead of time, not at midnight.** `npm run quiz:schedule` writes upcoming days to `src/content/quiz/schedule.json` and never changes a day once it's there. The app shows the set for today's UAE date and hides future days. This replaces the plan's midnight Supabase job: the tax team can preview upcoming sets, the archive and challenge links never change, and there's no job that can fail at midnight.
- **Selection rules:** 5 foundation, 10 intermediate, 5 advanced per track; nothing repeated within 14 days; least recently used first; at most 3 per topic where the bank allows; only questions whose rule applies on that date (for example, Small Business Relief items stop after 31 Dec 2026). Only approved questions, unless a preview is asked for.
- **"Both" track:** Corporate Tax gives 3 / 5 / 2 and VAT gives 2 / 5 / 3 from that day's sets, so the mix stays 5 / 10 / 5.
- **One scored attempt per track per day**, enforced by the database. Replays and past days are practice. An unfinished scored round can be picked up but not restarted, so nobody can preview the questions and then try again for the score.
- **Answer by tapping, then "Check answer".** One extra tap avoids mis-taps on a phone.
- **Time counts only while a question waits for an answer**, as in the document game.
- **Starting bank:** PassDrill's 47 verified UAE questions, converted and still marked draft (they are also public on passdrill.org), plus new batches. Every question is blind-checked by a separate AI verifier before tax review.

### Sharing and challenges

- **Every share is a challenge link** (play.obliqueconsult.com/c/AbC123xY), so every shared score carries its own card in link previews.
- **Challenge cards can't show a made-up score.** The server makes a link only from the player's own finished, recorded attempt and copies the score from the database.
- **Cards in three sizes**, drawn on request in Oblique's style: wide 1200×630 (LinkedIn and link previews), square 1080×1080, tall 1080×1920 (Stories and Status).
- **The share panel:** on phones, "Share…" opens the phone's own menu and "Share image" sends the tall card itself. On every device there are LinkedIn, WhatsApp, Email and Copy link buttons, plus "Save card" in all three sizes.
- **Names on cards:** the player's display name, or "A friend". The share panel offers to add a name, which also becomes their display name.
- **The friend's journey:** the challenge page previews the first question or document; "Take the challenge" signs them in if needed (recording the source as "challenge" and who referred them), then opens the same set in the same order. They see "You beat Sara" side by side, and can send a rematch, whose card shows both scores.
- **You can't challenge yourself:** opening your own link plays the set normally.
- Challenge links need sign-in, so they work once Supabase is set up. Without it, sharing falls back to a plain link to the set.

### Spot the error on the website

- **The puzzle lives in the game, not in Framer**, at `play.obliqueconsult.com/spot-the-error`, and the website links to it. It changes by itself every day, and needs no Framer updates. See `docs/FRAMER.md`.
- **No sign-in on the public page.** Answers there aren't stored; the in-game daily document still needs sign-in. The daily document doesn't count for prizes, so trying it publicly first gains nothing.
- **Only `/embed/*` can be shown inside another site** (obliqueconsult.com and Framer). Every other page sends `frame-ancestors 'none'`.
- **Leaderboard box** (`/embed/leaderboard`): top 5 this month, cached 5 minutes. With prizes off it ranks Corporate Tax + VAT quiz points for everyone; with prizes on it shows the prize standings. Staff never appear. Dark by default, `?theme=light` for white sections.
- **Before launch** the public page doesn't show the launch-day document (unless `LAUNCH_PREVIEW=true` locally).

### Reporting problems with answers

- **"Report a problem with this answer"** sits under every explanation, including the public puzzle page. Reasons: wrong answer, out of date, unclear or typo, something else (needs a note). See `docs/REPORTS.md`.
- **Reports go to a database table, not straight to email.** The tax team reads them with `npm run reports` and closes each with what was done, so nothing gets lost in an inbox and there's a record of every fix.
- **Nothing is pulled automatically.** Three or more "answer is wrong" reports flag an item; a reviewer decides whether to fix it or put it on hold.

### Fair play, first visit and leads (decided 9 to 10 Nov 2026, after the audit)

- **Answers are only shown to a signed-in player, after their answer is stored.** Before this, a script could collect a day's 40 answers in 9 seconds without an account. Times are now measured on the server, an unfinished scored round can't be swapped for a practice one, and the mixed quiz is locked until both scored rounds are done. Answer options are shuffled per player.
- **"Play before sign-in" is a 5-question sample round, not the real quiz.** Letting visitors play today's real questions without an account would hand out the day's answers and reopen the prize cheat. The sample uses questions that are already public, saves nothing, and ends with "Play today's quiz".
- **Winners pass a short live check before a gift is sent** (in the prize rules). A second account can still see the questions first; this makes it not worth doing.
- **Players are asked who they are after their first quiz** (name, company, role: all optional), and shown a free-call offer matched to their weakest topic. Students see no offer. The wording for each topic is in `src/content/offers.json`.
- **Company leaderboards: later.** Company names are collected now so the data is there when it's built.
- **LinkedIn sign-in is built but switched off** until a LinkedIn app exists (`docs/SETUP.md`, section 7). A new LinkedIn player's source, referrer, terms time and marketing tick are written once, straight after sign-in, and only while the account is new (10 minutes, nothing played), so an existing player can never be moved to a different referrer.
- **Analytics is PostHog (EU), identified by player id, never email.** Nothing is sent until its key is set.
- **Tests live in the repository and run on every push** (`tests/README.md`): database rules in an in-memory database, and the game in a real browser against a local Supabase.

### Local testing

A full local Supabase (`npx supabase start`) now runs the real sign-in emails, database rules and challenges end to end. These checks pass: 26 for sign-in and scoring, 30 for challenges, 20 for the quiz, 36 for prizes and referrals, and 63 for the database rules (31 earlier + 32 for prizes).

### Content status (20 Oct 2026)

| Content | Drafted | Usable now | Target |
| --- | --- | --- | --- |
| Corporate Tax questions | 202 | 200 (50 / 100 / 50) | 200 |
| VAT questions | 206 | 199 (50 / 99 / 50) | 200 |
| Shift documents (6 shifts) | 60 | 60 | 60 |
| Daily documents | 30 | 30 | 30 |

Every question and every document was answered blind by a separate AI verifier. The verifiers agreed with 406 of 408 question keys and all 90 document answers. Nine questions are on hold until a reviewer fixes them (see the Hold column in the review workbooks). Nothing is approved yet: every item needs a named reviewer.

**Review workbooks:** `npm run review:export` writes `review/oblique-play-review-ct.xlsx` (Ashta, Pranay) and `review/oblique-play-review-vat.xlsx` (Aidarous, Arslan). Reviewers edit the yellow cells and choose Approve / Needs changes / Reject. `npm run review:import -- <file>` applies their work.

### Before launch day

1. Import the reviewed workbooks and run both checkers.
2. **Reset the preview schedule**, then build the real one from approved questions only:
   `echo '[]' > src/content/quiz/schedule.json && npm run quiz:schedule -- --from 2026-12-01 --days 10` (done 8 Nov; covers 1 to 9 Dec, as VAT has 99 intermediate questions).
   The current schedule is a draft preview from 20 Oct. If it were kept, its questions would count against the 14-day no-repeat rule.
3. The first weekly batch of new questions must be approved and scheduled by quiz day 8 (Tue 8 Dec).
4. **Prizes:** legal check on whether a promotion permit is needed, approve `/prizes/rules`, exclude reviewers by email, then set `PRIZES_ENABLED=true` (`docs/PRIZES.md`).

## Risks to act on

1. **Corporate email link scanners** (such as Microsoft Safe Links) can use up the one-time sign-in token before the player does. Fix: the email button opens our own page with a "Confirm sign-in" button. Test with real bank email addresses.
2. **E-invoicing** may change tax invoice rules for large businesses from early 2027. Reviewers to confirm the dates; Module 1 documents may need a refresh.
3. **Diagnostic booking.** Add a booking button on results screens for business owners.
4. **HubSpot cost.** Players without marketing consent go in as non-marketing contacts.
5. **In-app browsers** (LinkedIn, WhatsApp) can't add to home screen. Show "Open in Safari / Chrome" first.
6. **Prize permit.** Prize competitions in the UAE may need a permit (in Dubai, from the Department of Economy and Tourism). Confirm with a lawyer before the prizes are announced (planned for Thu 26 Nov) and switched on.
7. **Referral farming.** An iPhone makes fake sign-ups worth trying. Defences: friends must finish a quiz, email aliases are merged, 10 a month at most, and winners' referrals are checked by hand before payment.
