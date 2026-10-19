import { LegalPage } from "@/components/LegalPage";

export const metadata = { title: "Terms · by Oblique" };

// DRAFT: to be reviewed by Oblique before launch.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="19 October 2026">
      <h2>A learning game, not advice</h2>
      <p>
        Everything in this game is a training exercise. The businesses, people and documents are invented. Nothing here
        is tax, legal or accounting advice, and you shouldn&apos;t rely on it for a real decision. For advice on your
        own situation, speak to a qualified adviser.
      </p>

      <h2>Accuracy</h2>
      <p>
        Every question and document is reviewed by a qualified Oblique reviewer, and each one shows the rule and date it
        is based on. Tax rules change, and an item may be out of date by the time you play it. If you spot an error,
        please tell us.
      </p>

      <h2>Fair play</h2>
      <ul>
        <li>One account per person.</li>
        <li>Choose a display name that isn&apos;t offensive and doesn&apos;t impersonate anyone.</li>
        <li>Don&apos;t try to interfere with the game, its scores or other players.</li>
      </ul>
      <p>We may remove names, scores or accounts that break these rules.</p>

      <h2>The game itself</h2>
      <p>
        The game is free and provided as it is. We may change it, pause it or end it. The content, design and Oblique
        name and marks belong to Oblique Consult.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms:{" "}
        <a href="mailto:privacy@obliqueconsult.com" className="underline underline-offset-2">
          privacy@obliqueconsult.com
        </a>
        .
      </p>
    </LegalPage>
  );
}
