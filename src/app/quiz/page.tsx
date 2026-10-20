import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackPicker } from "@/components/quiz/TrackPicker";
import { getDailySet, TRACKS } from "@/lib/quiz/content";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import type { PlayTrack } from "@/lib/quiz/types";

export const metadata = { title: "Daily quiz · by Oblique" };
// The page depends on today's date in the UAE, so it's built per request.
export const dynamic = "force-dynamic";

export default function QuizHome() {
  const today = uaeToday();
  const available = !!getDailySet(today);
  const tracks = (Object.keys(TRACKS) as PlayTrack[]).map((id) => ({ id, ...TRACKS[id] }));

  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{longDate(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Daily quiz</h1>
        <p className="mt-1 text-sm text-muted">
          A fresh set of 20 every day at midnight UAE time. Everyone gets the same questions, so scores are fair to compare.
        </p>
        {available ? (
          <TrackPicker today={today} tracks={tracks} />
        ) : (
          <p className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
            Today&apos;s set isn&apos;t ready yet. Please check back soon.
          </p>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
