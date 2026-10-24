# Monthly prizes: how to run them

The top 3 players each month win **AED 2,000, AED 1,000 and AED 500**. Amounts and referral settings are in `src/content/prizes.json`; the points rules are in `prize_totals()` in `supabase/migrations/20261024000001_prizes.sql`. Keep the two in step.

## How points work

- **Quiz points:** 1 per correct answer in each day's scored Corporate Tax and VAT quizzes (a player's first go, on the day). Up to 40 a day. The "Both" quiz reuses the same questions, so it earns nothing; nor do practice rounds or past days.
- **Referral points:** 10 per friend who signs up through the player's invite link (`/i/<code>`) or a challenge link they shared, and finishes their first scored daily quiz. Up to 10 friends (100 points) a month. A friend counts in the month of that first quiz.
- Referrals don't count if the friend's email is the referrer's own mailbox (`sara.k+2@gmail.com` is the same as `sarak@gmail.com`), or if that mailbox already had an account.
- **Ties:** more quiz points, then lower total time. A complete tie means the prizes are shared; the script stops and asks a person.
- **The prize board** only shows players who have entered (ticked the rules box on `/prizes`), aren't excluded, and have at least one scored round that month.

Worked check for November 2026 (3 to 30 Nov = 28 days): the most quiz points possible is 28 × 40 = 1,120. The referral cap of 100 is 100 ÷ 1,120 ≈ 9% of that, so knowledge still decides who wins.

## Before switching prizes on

1. **Legal check (required).** In Dubai, the Department of Economy and Tourism (DET) issues permits for promotional competitions with prizes, and other emirates have similar rules. Ask a UAE lawyer, or DET, whether this free, skill-based competition needs a permit in Oblique's emirate. If it does, add the permit number to `/prizes/rules`.
2. **Approve the rules** at `/prizes/rules` (`src/app/prizes/rules/page.tsx`): fill in Oblique's legal name and licence number, then have them reviewed alongside the privacy notice and terms.
3. **Exclude reviewers and family.** Anyone with an `@obliqueconsult.com` email is excluded automatically. For others (for example reviewers using personal email), in the Supabase SQL editor:
   ```sql
   update players set prize_excluded = true where email in ('reviewer@gmail.com', 'family@example.com');
   ```
4. **Turn it on:** in Vercel, set `PRIZES_ENABLED=true` and redeploy. Points and referrals are recorded from launch either way, so turning it on later loses nothing.
5. Re-run `npm run hubspot:setup` once, to add the *Oblique Play: entered monthly prizes* property.

## Each month (on the 1st, or the next working day)

1. **See the standings:** `npm run prizes:close -- 2026-11 --preview`
2. **Record the winners:** `npm run prizes:close -- 2026-11`. This writes the top 3 to the `prize_awards` table with status `contacting`, and prints their emails. It refuses to run before the month has ended.
3. **Email each winner** within 7 days (template below). They have 14 days to reply.
4. **Check eligibility:** full name matches the Emirates ID, aged 18+, UAE resident, not staff, a reviewer or their family. Then, in the Supabase table editor, open `prize_awards` and set `legal_name`, and `status` to `verified`. Delete the ID copy from your email once it's checked.
5. **Pay** by bank transfer to a UAE account in the winner's name. Keep bank details in your banking system only, never in the game's database. Set `status` to `paid`; the payment date fills in automatically.
6. **If a winner doesn't reply in 14 days or isn't eligible:** set their `status` to `forfeited` and add a note. Run step 2 again: places move up to the next eligible players, and the new winners are added for you to contact. The script never moves a winner who is already `verified` or `paid`; if that would be needed, it stops and asks you to sort it out by hand.
7. **Announce:** the game shows last month's winners under their leaderboard names. For a LinkedIn post, ask each winner first whether you can use their real name.

### Checking referrals look genuine

Before paying a winner whose points include referrals, glance at their friends:

```sql
select f.email, f.created_at, f.source
from players f
join players r on r.id = f.referred_by
where r.email = 'winner@example.com'
order by f.created_at;
```

Many sign-ups minutes apart from one unusual domain, or friends who played once and never again, are worth a question. The rules allow disqualifying fake sign-ups.

### Email template for winners

> **Subject: You won AED [amount] in the UAE tax game**
>
> Hi [board name],
>
> Congratulations! You finished [1st/2nd/3rd] in Oblique's UAE tax game for [month], with [points] points, and won AED [amount].
>
> To claim your prize, please reply within 14 days with:
> - your full name as it appears on your Emirates ID
> - a copy of your Emirates ID (we only use it to check the prize rules, and delete it once checked)
> - the UAE bank account in your name for the transfer (account name, bank, IBAN)
>
> The prize rules are at play.obliqueconsult.com/prizes/rules.
>
> Would you be happy for us to congratulate you by name on LinkedIn? Entirely optional.
>
> Best,
> [Name], Oblique

## Costs

Three prizes a month: 2,000 + 1,000 + 500 = **AED 3,500 a month**, or AED 42,000 over 12 months (3,500 × 12).
