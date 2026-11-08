import { LegalPage } from "@/components/LegalPage";
import { PRIZE_RULES } from "@/lib/prizes";

export const metadata = { title: "Prize rules · by Oblique" };

// DRAFT: to be reviewed by Oblique's lawyer before prizes are switched on,
// including whether a promotion permit is needed (docs/PRIZES.md).
export default function PrizeRulesPage() {
  const { referralPoints, referralCap, replyDays } = PRIZE_RULES;
  return (
    <LegalPage title="Monthly prize rules" updated="8 November 2026">
      <h2>Who runs it</h2>
      <p>
        The monthly prizes are run by Oblique Consult [full legal name, licence number and emirate]. [Permit number, if one
        is needed.]
      </p>

      <h2>When</h2>
      <p>
        Prizes run for three months: December 2026, January 2027 and February 2027. Each month is a separate
        competition, from the 1st to the last day of the month, in UAE time (GMT+4).
      </p>

      <h2>Who can win</h2>
      <ul>
        <li>You must be 18 or over and live in the UAE, with a valid Emirates ID.</li>
        <li>
          Oblique&apos;s staff, partners and contractors, anyone who has reviewed questions for the game, and their
          immediate families and households can play but can&apos;t win.
        </li>
        <li>One account per person. Prizes go only to the person who owns the account.</li>
      </ul>

      <h2>How to enter</h2>
      <p>
        Entry is free and you don&apos;t need to buy anything. Sign in, open the Prizes page and confirm you meet these
        rules. Your points for the whole month count, even if you enter late in the month. You can withdraw at any time.
      </p>

      <h2>Points</h2>
      <ul>
        <li>
          1 point for each correct answer in your scored round of each day&apos;s Corporate Tax quiz and VAT quiz: your
          first go, on the day. That&apos;s up to 40 points a day. The &quot;Both&quot; quiz, practice rounds and past
          days don&apos;t earn points.
        </li>
        <li>
          {referralPoints} points for each friend who signs up through your invite link or a challenge link you shared, and
          finishes their first scored daily quiz in that month. Up to {referralCap} friends count each month, so{" "}
          {referralPoints * referralCap} points at most. A friend counts in the month they finish that first quiz, and only once
          ever.
        </li>
        <li>
          A friend doesn&apos;t count if the email address belongs to you, is a variation of an address that already has
          an account, or the account doesn&apos;t belong to a real, different person.
        </li>
        <li>You need at least one scored quiz in the month to appear on the prize board.</li>
      </ul>

      <h2>Winners and ties</h2>
      <p>
        The 3 players with the most points when the month ends win. If points are tied, the player with more quiz points
        ranks higher, then the player with the lower total time. If players are still exactly tied, each of them receives
        the prize for the higher of their places.
      </p>

      <h2>Prizes</h2>
      <p>Each month:</p>
      <ul>
        <li>1st: an iPhone or a Samsung Galaxy S26, the winner&apos;s choice (the current standard model, base storage).</li>
        <li>2nd: Apple AirPods (standard model).</li>
        <li>3rd: a power bank [brand and capacity].</li>
        <li>
          Prizes are delivered to an address in the UAE, or collected from Oblique&apos;s office. They can&apos;t be
          exchanged for cash or transferred to someone else.
        </li>
        <li>If a prize isn&apos;t available, we&apos;ll give one of similar or higher value.</li>
      </ul>

      <h2>Claiming a prize</h2>
      <p>
        We email winners within 7 days of the month ending. To claim, reply within {replyDays} days with your full name,
        a copy of your Emirates ID so we can check you meet these rules, and a UAE delivery address (or ask to collect).
        We aim to deliver within 30 days of checking. If a winner doesn&apos;t reply in time or doesn&apos;t meet the
        rules, the prize places move to the next eligible players in leaderboard order.
      </p>

      <h2>Fair play</h2>
      <p>
        We may disqualify anyone who uses more than one account, creates or arranges fake sign-ups, shares answers to
        get ahead, uses automated tools or otherwise interferes with the competition. If we disqualify you, we&apos;ll
        tell you why.
      </p>

      <h2>Publicity</h2>
      <p>
        We show winners on the game under the name they chose for the leaderboard: their display name or their random
        anonymous name. We only use a winner&apos;s real name or photo, for example on LinkedIn, if they agree.
      </p>

      <h2>Changes</h2>
      <p>
        We may change or end the prizes by updating this page. A change never takes away points already earned in the
        current month, and that month&apos;s prizes will still be given.
      </p>

      <h2>Your data</h2>
      <p>
        How we use your details for the prizes is explained in the{" "}
        <a href="/privacy" className="underline underline-offset-2">
          privacy notice
        </a>
        .
      </p>
    </LegalPage>
  );
}
