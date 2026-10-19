# Decisions and plan corrections

Changes to the product plan (dated 20 Oct 2026), agreed 19 Oct 2026.

## Decided

| Topic | Decision |
| --- | --- |
| Launch date | **Tue 3 Nov 2026** (moved from Sun 1 Nov: a weekday gets more LinkedIn reach, and 1 Nov was only 13 days from the plan date). |
| Question bank at launch | **200 reviewed questions per track** (10 days of unique sets), then 100 new per track each week. |
| Reviewers | Corporate Tax: Ashta and Pranay. VAT (questions and all Module 1 documents): Aidarous and Arslan. |
| Leaderboard | Players choose how they appear: under their display name, or anonymously under a random name (for example "Swift Falcon 42"). |
| Arabic | English only at launch; Arabic in phase two. Build layouts so right-to-left can be added later. |
| App store versions | Phase two. |
| Build team | Wahaj and Claude only. |
| Game title | On hold. |

## Corrected numbers (each checked twice)

**Content load.** 90 documents + 200 Corporate Tax questions + 200 VAT questions = **490 items** (the plan's 890 assumed 400 per track).

**Load per reviewer.** Reviews finish by Mon 2 Nov (day 13). Mon 19 Oct to Mon 2 Nov has **11 working days**.

| Reviewers | Items | Per reviewer | Per reviewer per working day |
| --- | --- | --- | --- |
| VAT (Aidarous, Arslan) | 200 questions + 90 documents = 290 | 145 | 145 ÷ 11 ≈ 13 |
| Corporate Tax (Ashta, Pranay) | 200 questions | 100 | 100 ÷ 11 ≈ 9 |

**Difficulty mix.** Each daily set is 5 foundation, 10 intermediate, 5 advanced (25% / 50% / 25%). So each launch bank of 200 is **50 / 100 / 50**, and each weekly batch of 100 is **25 / 50 / 25**.

**"Both" track.** 10 of each track's 20 cannot be split 2.5 / 5 / 2.5. Rule: Corporate Tax contributes 3 / 5 / 2 and VAT contributes 2 / 5 / 3, giving 5 / 10 / 5 overall.

**14-day no-repeat rule.** Days 1–10 use all 200 launch questions. The first weekly batch must be live by **quiz day 8 (Tue 10 Nov)**, or the daily set runs short on day 11 (Fri 13 Nov). With a batch every 7 days after that, a simulation never runs short.

**Midnight UAE time** is 20:00 UTC (the UAE is UTC+4 with no daylight saving). The daily job's schedule is `0 20 * * *`.

## Build schedule (day 14 = Tue 3 Nov)

| Days | Dates | Work |
| --- | --- | --- |
| 1–3 | Wed 21 – Fri 23 Oct | Module 1 core, Shifts 1–3. **Done on Mon 19 Oct.** |
| 4–5 | Sat 24 – Sun 25 Oct | Email-code sign-in, Resend, consent, Supabase to HubSpot. **Code done on Mon 19 Oct; waiting on account setup (docs/SETUP.md).** |
| 6–7 | Mon 26 – Tue 27 Oct | Module 2: daily quiz |
| 8 | Wed 28 Oct | Sharing, share cards, challenge links |
| 9 | Thu 29 Oct | Shifts 4–6, daily document, streaks, leaderboard, certificate |
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

## Risks to act on

1. **Corporate email link scanners** (such as Microsoft Safe Links) can use up the one-time sign-in token before the player does. Fix: the email button opens our own page with a "Confirm sign-in" button. Test with real bank email addresses.
2. **E-invoicing** may change tax invoice rules for large businesses from early 2027. Reviewers to confirm the dates; Module 1 documents may need a refresh.
3. **Diagnostic booking.** Add a booking button on results screens for business owners.
4. **HubSpot cost.** Players without marketing consent go in as non-marketing contacts.
5. **In-app browsers** (LinkedIn, WhatsApp) can't add to home screen. Show "Open in Safari / Chrome" first.
