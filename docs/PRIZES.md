# Monthly prizes: how to run them

For three months (**December 2026, January 2027 and February 2027**) the top 3 players each month win a gift:

| Place | Gift |
| --- | --- |
| 1st | An iPhone or a Samsung Galaxy S26, the winner's choice (current standard model, base storage) |
| 2nd | Apple AirPods (standard model) |
| 3rd | A power bank |

The months and gifts are in `src/content/prizes.json`; the points rules are in `prize_totals()` in `supabase/migrations/20261024000001_prizes.sql`. Keep the two in step. Outside those months the game carries on without prizes: before December the prizes page says when they start; after February it thanks players and shows February's winners.

## How points work

- **Quiz points:** 1 per correct answer in each day's scored Corporate Tax and VAT quizzes (a player's first go, on the day). Up to 40 a day. The "Both" quiz reuses the same questions, so it earns nothing; nor do practice rounds or past days.
- **Referral points:** 10 per friend who signs up through the player's invite link (`/i/<code>`) or a challenge link they shared, and finishes their first scored daily quiz. Up to 10 friends (100 points) a month. A friend counts in the month of that first quiz.
- Referrals don't count if the friend's email is the referrer's own mailbox (`sara.k+2@gmail.com` is the same as `sarak@gmail.com`), or if that mailbox already had an account.
- **Ties:** more quiz points, then lower total time. If players are still exactly tied, each gets the gift for the higher place; the script stops and asks a person to record it.
- **The prize board** only shows players who have entered (ticked the rules box on `/prizes`), aren't excluded, and have at least one scored round that month.

Worked check: December and January have 31 days, so the most quiz points possible is 31 × 40 = 1,240, and the 100-point referral cap is 100 ÷ 1,240 ≈ 8% of that. February 2027 has 28 days: 28 × 40 = 1,120, and 100 ÷ 1,120 ≈ 9%. Knowledge still decides who wins.

## Cost (rough; check current UAE prices before buying)

| Gift | Rough price |
| --- | --- |
| iPhone or Galaxy S26, standard model | AED 3,400 to 3,800 |
| AirPods | AED 550 to 900 |
| Power bank | AED 100 to 250 |
| **Each month** | **AED 4,050 to 4,950** |
| **Three months** | **AED 12,150 to 14,850** |

(4,050 = 3,400 + 550 + 100, and 4,950 = 3,800 + 900 + 250; each times 3.) These are estimates, not quotes.

## Before switching prizes on

1. **Legal check (required).** In Dubai, the Department of Economy and Tourism (DET) issues permits for promotional competitions with prizes, and other emirates have similar rules. Ask a UAE lawyer, or DET, whether this free, skill-based competition needs a permit in Oblique's emirate. If it does, add the permit number to `/prizes/rules`.
2. **Approve the rules** at `/prizes/rules` (`src/app/prizes/rules/page.tsx`): fill in Oblique's legal name and licence number, then have them reviewed alongside the privacy notice and terms.
3. **Exclude reviewers and family.** Anyone with an `@obliqueconsult.com` email is excluded automatically. For others (for example reviewers using personal email), in the Supabase SQL editor:
   ```sql
   update players set prize_excluded = true where email in ('reviewer@gmail.com', 'family@example.com');
   ```
4. **Turn it on:** in Vercel, set `PRIZES_ENABLED=true` and redeploy. Points and referrals are recorded from launch either way, so turning it on later loses nothing.
5. Re-run `npm run hubspot:setup` once, to add the *Oblique Play: entered monthly prizes* property.

## Each prize month (on the 1st of the next month, or the next working day)

1. **See the standings:** `npm run prizes:close -- 2026-12 --preview`
2. **Record the winners:** `npm run prizes:close -- 2026-12`. This writes the top 3 to the `prize_awards` table with their gift and status `contacting`, and prints their emails. It refuses to run before the month has ended, or for a month that isn't a prize month.
3. **Email each winner** within 7 days (template below). They have 14 days to reply.
4. **Check eligibility:** full name matches the Emirates ID, aged 18+, UAE resident, not staff, a reviewer or their family. Then, in the Supabase table editor, open `prize_awards` and set `legal_name`, and `status` to `verified`. Delete the ID copy from your email once it's checked.
5. **Deliver the gift** to the UAE address the winner gave, or arrange collection from the office; aim for within 30 days. For 1st place, ask which phone they want first (iPhone or Galaxy S26). Keep addresses in your email or courier system only, never in the game's database. Set `status` to `delivered`; the date fills in automatically. A photo of the hand-over (with permission) makes a strong LinkedIn post.
6. **If a winner doesn't reply in 14 days or isn't eligible:** set their `status` to `forfeited` and add a note. Run step 2 again: places move up to the next eligible players, and the new winners are added for you to contact. The script never moves a winner who is already `verified` or `delivered`; if that would be needed, it stops and asks you to sort it out by hand.
7. **Announce:** the game shows last month's winners under their leaderboard names. For a LinkedIn post, ask each winner first whether you can use their real name.

### Checking referrals look genuine

Before sending a gift to a winner whose points include referrals, glance at their friends:

```sql
select f.email, f.created_at, f.source
from players f
join players r on r.id = f.referred_by
where r.email = 'winner@example.com'
order by f.created_at;
```

Many sign-ups minutes apart from one unusual domain, or friends who played once and never again, are worth a question. The rules allow disqualifying fake sign-ups.

### Email template for winners

> **Subject: You won [an iPhone or Galaxy S26 / AirPods / a power bank] in the UAE tax game**
>
> Hi [board name],
>
> Congratulations! You finished [1st/2nd/3rd] in Oblique's UAE tax game for [month], with [points] points, and won [the gift].
>
> To claim your prize, please reply within 14 days with:
> - your full name as it appears on your Emirates ID
> - a copy of your Emirates ID (we only use it to check the prize rules, and delete it once checked)
> - a UAE delivery address and phone number for the courier, or tell us if you'd rather collect it from our office
> - [1st place only] whether you'd like the iPhone or the Samsung Galaxy S26
>
> The prize rules are at play.obliqueconsult.com/prizes/rules.
>
> Would you be happy for us to congratulate you by name on LinkedIn? Entirely optional.
>
> Best,
> [Name], Oblique
