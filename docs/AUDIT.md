# Audit: UAE Tax Learning Game

**Date:** 10 Nov 2026 · **Audited:** commit `0ff2fc4` and the live test copy on Railway · **Launch:** Tue 1 Dec 2026

## The short version

The game is well built where players can see it: fast, accessible and consistent. Its weak points are the ones that matter most once an iPhone is on offer and once you want it to bring in clients:

1. **The prize competition can be cheated in seconds.** Three separate holes, all fixable before launch.
2. **New visitors must hand over an email before seeing a single question.** That will lose most of the people your LinkedIn posts send.
3. **The game barely tries to turn players into leads.** Most players are never asked who they are, so the "free diagnostic" offer never appears for them.
4. **Nothing is measured, monitored or automatically tested.** You would launch blind.
5. **Content runs out on 9 Dec.**

| Area | Rating | One line |
| --- | --- | --- |
| Speed | Strong | Lighthouse 92 to 99 out of 100 on a simulated mid-range phone |
| Accessibility | Strong | 0 violations on 20 screens (axe, WCAG 2.1 AA); Lighthouse 98 to 100 |
| Visual quality and consistency | Strong | One clear style, works in dark mode, no page errors |
| Data protection in the database | Good | Every table locked down; answers never sent to the browser early |
| Fair play for prizes | **Weak** | Answers can be harvested without an account |
| First-visit experience | **Weak** | About 9 steps before question 1 |
| Turning players into leads | **Weak** | Role asked in one of two games; no company; one generic offer |
| Measurement and monitoring | **Missing** | No analytics, no error alerts, no tests in the repository |
| Content supply | **At risk** | 9 days scheduled; 280 questions per track needed to run indefinitely, about 200 exist |

## How this was checked

- Read all 9,596 lines of code, with the server endpoints and database rules read line by line.
- Ran attacks against the live test copy (results below are measured, not guessed).
- Lighthouse on 4 pages; axe accessibility scan on 20 screens; a scripted first-visit walkthrough on a phone-sized screen in light and dark mode, and on desktop.
- `npm audit` for known problems in the libraries used.

---

## 1. Fair play and security

### Must fix before prizes go live

| # | Finding | Evidence | Fix | Effort |
| --- | --- | --- | --- | --- |
| 1.1 | **Anyone can download the day's answers without an account.** The answer-checking endpoint replies with the correct answer and explanation to any caller. | A script with no sign-in collected **40 of 40** correct answers for the day (both prize quizzes) in **9 seconds** on the test copy. | Only answer signed-in players, and only for a question in an attempt they have open; record the answer before revealing it (it already does for signed-in players). Add a limit on requests per player per minute. | Half a day |
| 1.2 | **Time is reported by the player's phone, and time breaks ties.** The server stores whatever number arrives, with a minimum of 0. | Code: `Math.max(0, Number(timeMs))` in `src/lib/quiz/record.ts`. A cheat sends 0 for every question and wins every tie. | Measure time on the server: stamp when each question is served and when its answer arrives. | 1 day |
| 1.3 | **The "Both" quiz gives away half of each prize quiz.** It reuses 10 Corporate Tax and 10 VAT questions from the same day and shows every answer, and a player can play it first. | By design: "Both" draws from the day's two sets. No script needed. | During prize months, lock "Both" until the player has finished both scored quizzes that day (or remove it). | 2 hours |
| 1.4 | **A second account shows the answers.** Play once on a throwaway account, then score 20/20 on the real one. Everyone gets the same questions, so this can't be closed completely. | Inherent in "same questions for everyone". | Make it not worth it: (a) shuffle answer options per player; (b) flag perfect scores with very short times for review; (c) **require winners to pass a short live check** (say 5 questions on a video call) before a gift is sent, and say so in the rules; (d) offer LinkedIn sign-in (see 4.2), which makes throwaway accounts harder. | (a) half a day, (b) half a day, (c) rules text only |

Until 1.1 to 1.3 are fixed, do not switch prizes on. The game itself can launch without them, because without prizes there is little reason to cheat.

### Should fix

| # | Finding | Fix | Effort |
| --- | --- | --- | --- |
| 1.5 | No limits on how fast endpoints can be called (only the report form has one). | Per-player and per-address limits on answer checking and sign-in requests. | Half a day |
| 1.6 | Missing standard security headers: HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. The server also announces "Next.js". | Add them in `next.config.ts`; turn off `poweredByHeader`. | 1 hour |
| 1.7 | `npm audit` reports 2 issues (1 high, 1 moderate) in the Next.js version used, both in its bundled CSS tool. They affect building the site, not visitors, so the practical risk is low. | Upgrade Next.js after launch; it is a major-version jump, so test first. | 1 day |
| 1.8 | The report form's limit trusts an address header that a caller can fake. | Use the hosting platform's verified address. | 1 hour |

### What is already right (keep it)

- All 9 database tables have access rules switched on; players can only read and change their own rows, and only named columns.
- Answers and explanations are stripped before any page is sent; future days' sets are refused.
- One scored attempt per player, per quiz, per day is enforced by the database itself, not just the app.
- Scores are counted on the server from stored answers; a player can't post their own score.
- Sign-in links survive company email scanners; sign-out can't be triggered by a link preview; redirects after sign-in can't leave the site.
- Only the two website boxes can be framed by other sites.

---

## 2. Reliability and running it

| # | Finding | Why it matters | Fix | Effort |
| --- | --- | --- | --- | --- |
| 2.1 | **No automated tests in the repository, and no CI.** About 250 checks exist, but only as scripts on the machine that built the game. | The next change (by anyone) can break sign-in or scoring and nobody finds out until players complain. | Move the tests into the repo and run them on every push (GitHub Actions). | 1 to 2 days |
| 2.2 | **No error monitoring or uptime alert.** | If the database is down on launch morning, you learn it from LinkedIn comments. | Sentry (or similar) plus a free uptime check that emails you. | Half a day |
| 2.3 | **No analytics.** PostHog was planned and never built. | You can't see how many visitors start, sign in, finish, share or come back, so you can't improve any of it or judge which posts work. | Add PostHog with 8 to 10 named events (visit, start, sign-in asked, signed in, round finished, shared, challenge accepted, diagnostic clicked). | 1 day |
| 2.4 | **No custom error or "not found" pages.** A broken link shows Next.js's bare "404" page; a server error shows a blank technical page. | Looks broken, and strands the player. | Branded error and not-found pages with a way back to the game. | 2 hours |
| 2.5 | Every page is rebuilt for every visitor (nothing is cached), and the prizes page takes about 1.5 seconds on the server. | Fine at hundreds of players; slow and costly at thousands, exactly when a post takes off. | Cache the pages that are the same for everyone (rules, legal, hubs) and the prize standings for a minute. | 1 day |
| 2.6 | The prize points calculation re-reads every player's attempts on each view. | Same as above: fine now, slow later. | Add two indexes now; move to a stored monthly summary if players pass a few thousand. | 2 hours now |
| 2.7 | Privacy notice and terms still show "Draft for review". | Visible to every visitor. | Approve them, then flip one setting. | Your review |
| 2.8 | Deleting an account means emailing Oblique. | Acceptable legally if handled promptly, but a "delete my account" button is cleaner. | Self-service delete in the profile. | Half a day |
| 2.9 | The results screen shows "Day streak 0" for a moment before the real number arrives. | Verified on the test copy: 0, then 1 a few seconds later. The wrong number at the proudest moment. | Show a dash until the number loads. | 30 minutes |
| 2.10 | Leftover starter files in `public/` (default icons). | Clutter. | Delete. | 5 minutes |
| 2.11 | No sitemap or robots file. | Search engines find the public pages (home, spot the error, prize rules) more slowly, and nothing tells them to skip the private ones. | Add both; matters more once past questions become public pages (4.2 G). | 1 hour |

---

## 3. Usability

### The first visit (the biggest issue)

Measured on the test copy: a new visitor taps **3 times** and is then asked for an email. After that come typing the email, ticking a box, requesting a code, switching to their inbox, typing 6 digits and starting: **about 9 steps before question 1.** People arriving from a LinkedIn post have given you a few seconds of curiosity, not a commitment.

**Recommendation: let people play first, then ask.** Options, best first:

1. **Play the whole first round without signing in**, then: "You scored 14/20. Enter your email to save it, join the leaderboard and keep your streak." The score is the reason to sign up. (For prize fairness, the unsigned round can count once the email is confirmed straight after.)
2. Play the first 3 to 5 questions free, then ask.
3. At minimum, show one sample question on the home page.

The public "spot the error" page already works this way, and it is the best first impression in the product.

### Other findings

| # | Finding | Fix | Effort |
| --- | --- | --- | --- |
| 3.1 | **No way to revisit what you got wrong.** The results screen shows scores by topic but not the questions missed. For a learning game, this is the main thing a player wants next. | "Review your 6 misses" on the results screen, with the explanations. | 1 day |
| 3.2 | **The home page is the same for a first-timer and a 30-day regular.** No "today: Corporate Tax done, VAT to do", no streak, no rank. | A "today" panel for signed-in players: what's done, streak, rank, time until tomorrow's set. | 1 day |
| 3.3 | **The home page doesn't mention the daily document** ("spot the error"), though it's the most distinctive thing in the game. | Add it as a third card, or lead with it. | 1 hour |
| 3.4 | **Results don't say how you compare or what to do next.** No "better than 62% of today's players", no "now try VAT". | Add a percentile line and one suggested next step. | Half a day |
| 3.5 | **No "add to home screen", no prompt to leave LinkedIn's built-in browser, no sound or vibration.** All were planned for day 10 and not built. | Web app manifest and install prompt; an "open in Safari/Chrome" hint inside in-app browsers; optional sounds. | 1 to 2 days |
| 3.6 | **Email code is the only way to sign in.** | Add "Continue with LinkedIn" and "Continue with Google": one tap, no inbox. LinkedIn also supplies name and employer (see 4.2). | 1 day |
| 3.7 | **On a laptop the game is a narrow phone-width column** in the middle of an empty page. It works, but leaderboards, prizes and the home page waste the space. | A wider layout for those three pages. Low priority: most traffic will be phones. | 1 to 2 days |
| 3.8 | "Both" is an unclear name for the mixed quiz. | Rename to "Mixed", and see 1.3. | 10 minutes |
| 3.9 | Shifts cover VAT documents only; nothing equivalent for Corporate Tax. | A Corporate Tax document set (returns, transfer pricing forms) later. | Content work |

### What is already right (keep it)

- Speed: pages show in about 2 seconds on a simulated slow phone, with no layout jumping.
- Accessibility: zero violations across 20 screens; proper labels, focus and contrast; respects "reduce motion".
- Feedback is kind ("Not quite", "Every round teaches something") and always gives the rule, the reason and the law.
- One tap to answer, a second to confirm, which avoids mis-taps on a phone.
- Progress survives closing the browser mid-round.

---

## 4. What would sell

The game has two jobs for Oblique: get attention, and turn that attention into client conversations. It does the first reasonably and the second hardly at all.

### 4.1 The lead funnel leaks in three places

| Leak | Detail | Fix | Effort |
| --- | --- | --- | --- |
| **Most players are never asked who they are.** | The "what's your name and role?" card appears only after a document shift. Quiz players, likely the majority, never see it. No role means no "business owner" flag, so the free diagnostic offer never appears for them. | Show the card after the first quiz too. | 1 hour |
| **No company name.** | A lead without an employer is hard to qualify or route. | Add "Company" (optional) to the card; pass it to HubSpot. | 2 hours |
| **One generic offer for everyone.** | Only business owners see "free 30-minute diagnostic". A finance manager who scores 0/3 on transfer pricing sees nothing. | **Match the offer to what they got wrong:** map each quiz topic to an Oblique service. "Transfer pricing tripped you up. It trips up most groups: here's a free 20-minute review." Shown to every role, on the results screen, when a topic score is low. | 1 to 2 days, plus your wording |

The third fix is the single most valuable commercial change: the game already knows each player's weak topics, and that is exactly what a tax adviser wants to know about a prospect. Send the weakest topic to HubSpot as well, so your team can follow up with something specific.

### 4.2 Ideas, ranked by likely payoff

| # | Idea | Why it would work | Effort |
| --- | --- | --- | --- |
| A | **Company leaderboards: "Which firm knows UAE tax best?"** Players add their employer; firms are ranked by their best 5 players' average. | Turns one player into a recruiter for their whole team, gives LinkedIn a reason to argue (Big 4 against boutiques, banks against family offices), and puts company names on your leads. It suits the iPhone months: add a team prize, such as lunch for the winning firm. | 2 to 3 days |
| B | **LinkedIn sign-in and "Add to profile" for certificates.** | One-tap sign-in from the place your traffic comes from. A certificate that sits on LinkedIn profiles advertises the game for months. Real identities also make cheating harder. | 2 days |
| C | **A weekly email: "3 questions most people got wrong this week".** | You already collect marketing consent and have nowhere to use it. This builds an audience you own, brings players back and carries one Oblique offer per issue. HubSpot can send it. | 1 day to set up; 30 minutes a week |
| D | **A reminder before the streak breaks** (email at 6pm if they haven't played). | Daily games live on streaks; a nudge is the cheapest retention there is. | 1 day |
| E | **A result people want to paste.** Add a text version of the score, as popular word games do: a row of coloured squares and "UAE VAT quiz 17/20 🔥 5-day streak". | It gets pasted into WhatsApp groups and LinkedIn comments, where a link alone would not be. Works without an image preview. | Half a day |
| F | **Give the home page a share preview and a pitch.** The main link has no preview image at all today (checked on the test copy), so `play.obliqueconsult.com` pasted into LinkedIn shows a bare title. | The link you will share most is the one with no picture. Add an image, and rework the home page around one promise and one button ("Play today's quiz · 3 minutes · win an iPhone"). | Half a day |
| G | **Public pages for past questions,** each with its explanation and law reference, released the day after they are played. | 408 questions become 408 pages that answer real searches ("is a deposit subject to VAT UAE"). Free, lasting traffic, each page ending in "play today's quiz" and an Oblique offer. | 2 days |
| H | **"Oblique for Teams":** a private leaderboard and a simple manager view for a company's finance team. | A reason for a finance head to talk to Oblique: "train your team free for a month". The manager view shows the team's weak topics, which is your diagnostic conversation already written. | 1 week |
| I | **Show that people are playing:** "1,243 players this week" on the home page and website boxes. | Social proof; costs nothing once analytics exists. Wait until the numbers are worth showing. | 2 hours |
| J | **Arabic.** | Planned for phase two; matters for reach in government and family businesses. | Large |

### 4.3 Things to be careful with

- **Prizes attract prize hunters.** A referral that earns points brings sign-ups, not necessarily finance people. Watch the share of players with a company email or a stated role; if it drops, shift prize weight from referrals to quiz scores.
- **Announcing an iPhone before section 1 is fixed** invites exactly the wrong story on LinkedIn.
- **The legal check on prizes** is still open and must be done before the announcement planned for Thu 26 Nov.

---

## 5. Content

| Finding | Detail | What to do |
| --- | --- | --- |
| **The schedule ends on 9 Dec.** | 9 days are scheduled. Day 10 is one VAT intermediate question short. | First new batch approved and scheduled by Tue 8 Dec. |
| **The bank is too small to run without weekly top-ups.** | Each day uses 20 questions per track, and nothing repeats within 14 days, so the game needs 14 × 20 = **280 usable questions per track** (70 foundation, 140 intermediate, 70 advanced) to keep going on rotation. There are 200 Corporate Tax and 199 VAT. | Add about 80 per track (40 of them intermediate) to make the game self-sustaining; after that, new questions are for freshness rather than survival. |
| 9 questions are on hold. | Flagged during checking for possible errors or law changes. | A reviewer clears or fixes them. |
| 12 questions cite decisions that may have been replaced. | Noted in the review workbooks. | A reviewer confirms the references. |
| Players can now report problems. | Reports go to a list read with `npm run reports`. | Assign one person to check it twice a week. |

---

## 6. Suggested order

Effort figures are rough working estimates.

### Before launch (Tue 1 Dec)

| What | Section | Effort |
| --- | --- | --- |
| Close the three prize cheats | 1.1, 1.2, 1.3 | 2 days |
| Request limits and security headers | 1.5, 1.6 | Half a day |
| Play first, sign in after | 3 (first visit) | 1 to 2 days |
| Ask name, role and company after the first quiz | 4.1 | Half a day |
| Analytics and error alerts | 2.2, 2.3 | 1.5 days |
| Error pages, streak flash, home share preview, home mentions the daily document | 2.4, 2.9, 4.2 F, 3.3 | 1 day |
| Tests into the repository, run on every push | 2.1 | 1 to 2 days |
| Winner check in the prize rules; legal check; approve legal pages | 1.4, 2.7 | Yours |
| 80 more questions per track, or at least the first weekly batch | 5 | Content team |

That is roughly 8 to 10 working days of build, which fits before 1 Dec if started now. If time runs short, cut "play first" to "first 3 questions free" and leave the tests until launch week, but do not cut section 1.

### First two weeks after launch

Review your misses (3.1) · offers matched to weak topics (4.1) · pasteable result (4.2 E) · streak reminder and weekly email (4.2 C, D) · "today" panel on the home page (3.2) · option shuffling and suspicious-score flags (1.4).

### January to February (the prize months)

Company leaderboards (4.2 A) · LinkedIn sign-in and certificates on profiles (4.2 B) · public pages for past questions (4.2 G) · install prompt and in-app browser hint (3.5) · caching for scale (2.5).

### Later

Oblique for Teams (4.2 H) · Corporate Tax documents (3.9) · Arabic (4.2 J) · Next.js upgrade (1.7).
