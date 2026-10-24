import { AppHeader } from "@/components/AppHeader";
import { DailyGame } from "@/components/review/DailyGame";
import { SiteFooter } from "@/components/SiteFooter";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import { DAILY_START, getDailyDocument } from "@/lib/review/content";

const title = "Spot the error: today's UAE tax document · Oblique";
const description = "A free daily puzzle from Oblique. Is today's UAE tax invoice right, or is something off? A new one every day.";
export const metadata = {
  title,
  description,
  openGraph: { title, description, images: [{ url: "/spot-the-error/card", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image", title, description, images: ["/spot-the-error/card"] },
};
// Changes at midnight UAE time, so it's built per request.
export const dynamic = "force-dynamic";

// The public daily puzzle, linked from obliqueconsult.com. Anyone can
// answer without signing in. Answers are recorded only for signed-in
// players, and the daily document doesn't count towards prizes, so
// answering here first gains nothing in the game.
export default function SpotTheErrorPage() {
  const date = uaeToday();
  // Before launch the public page doesn't show the launch-day document.
  // SPOT_PREVIEW=true shows it anyway, for checking the page.
  if (date < DAILY_START && process.env.SPOT_PREVIEW !== "true") {
    return (
      <>
        <AppHeader />
        <main className="flex flex-1 flex-col px-4 pt-6">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Spot the error</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">The first document arrives on {longDate(DAILY_START)}.</h1>
          <p className="mt-3 text-base text-muted">
            A free daily puzzle from Oblique: one UAE tax document a day. Is it right, or is something off?
          </p>
        </main>
        <SiteFooter />
      </>
    );
  }
  const doc = getDailyDocument(date);
  if (!doc) return null;
  return <DailyGame key={date} date={date} doc={doc} needsSignIn={false} doneToday={null} variant="web" />;
}
