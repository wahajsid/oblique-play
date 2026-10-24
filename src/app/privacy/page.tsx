import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Privacy notice · by Oblique" };

// DRAFT: to be reviewed by Oblique against the UAE Personal Data Protection
// Law (Federal Decree-Law No. 45 of 2021) before launch.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy notice" updated="19 October 2026">
      <p>
        This game is run by Oblique Consult (&quot;Oblique&quot;, &quot;we&quot;). This notice explains what we collect
        when you play, why, and the choices you have.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your email address, so you can sign in and keep your progress.</li>
        <li>The display name and role you choose to give us (both optional).</li>
        <li>Your game activity: shifts and quizzes played, answers, scores, times and streaks.</li>
        <li>Who invited you, if you arrived through a challenge or invite link, and which site or post you came from.</li>
        <li>If you enter the monthly prizes: when you entered. If you win: your full name, the result of checking your
          Emirates ID, and the payment record.</li>
        <li>Whether you agreed to receive marketing emails, and when.</li>
        <li>Basic usage data, such as pages viewed and the device and browser you use.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the game: sign-in, saving progress, scores, challenges and leaderboards.</li>
        <li>
          To keep a record of you as a player in our customer system (HubSpot). If you tell us you&apos;re a business
          owner, we may contact you once about a free 30-minute tax diagnostic. If you book one, your name and email are
          passed to our booking page so you don&apos;t have to type them.
        </li>
        <li>To send you new shifts and tax updates, but only if you ticked the box to receive them.</li>
        <li>To understand which topics players find hardest, using combined figures that don&apos;t identify you.</li>
      </ul>

      <h2>Monthly prizes</h2>
      <p>
        If you win, we use your details only to check you meet the{" "}
        <a href="/prizes/rules" className="underline underline-offset-2">
          prize rules
        </a>{" "}
        and to pay you. We check your Emirates ID but don&apos;t keep a copy once the check is done. Bank details are
        used only to make the payment and aren&apos;t stored in the game. Payment records are kept as long as the law
        requires for financial records. If someone signs up through your link, we tell you how many friends counted, but
        not who they are.
      </p>

      <h2>On the leaderboard</h2>
      <p>
        You choose whether you appear under your display name or under a random anonymous name. You can change this at
        any time.
      </p>

      <h2>Who processes it for us</h2>
      <p>
        Supabase (database and sign-in), Vercel (hosting), Resend (sign-in emails), HubSpot (customer records),
        PostHog (usage analytics) and Calendly (booking a diagnostic, if you choose to). They process data only on our instructions. Some of these services store data
        outside the UAE.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Playing never depends on marketing consent. You can unsubscribe from any marketing email.</li>
        <li>
          You can ask us for a copy of your data, or to correct or delete it, by emailing{" "}
          <a href="mailto:privacy@obliqueconsult.com" className="underline underline-offset-2">
            privacy@obliqueconsult.com
          </a>
          .
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>We keep your player record while you play, and delete it on request or after two years without activity.</p>
    </LegalPage>
  );
}
