import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TrackPicker } from "@/components/quiz/TrackPicker";
import { getDailySet, TRACKS } from "@/lib/quiz/content";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import { PRIZE_GIFTS, prizesRunning } from "@/lib/prizes";
import { isMixedUnlocked } from "@/lib/quiz/record";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";
import type { PlayTrack } from "@/lib/quiz/types";

export const metadata = { title: "Daily quiz · by Oblique" };
// The page depends on today's date in the UAE, so it's built per request.
export const dynamic = "force-dynamic";

export default async function QuizHome() {
  const today = uaeToday();
  const available = !!getDailySet(today);
  // The mixed quiz reuses today's Corporate Tax and VAT questions and shows
  // their answers, so it opens only after both scored rounds are finished.
  const [player, mixedOpen] = await Promise.all([getSignedInPlayer(), isMixedUnlocked(today)]);
  const tracks = (Object.keys(TRACKS) as PlayTrack[]).map((id) => ({
    id,
    ...TRACKS[id],
    locked: id === "both" && !mixedOpen ? "Opens once you've finished today's Corporate Tax and VAT quizzes. It uses the same questions." : undefined,
  }));
  const newHere = authEnabled && !player;

  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{longDate(today)}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Daily quiz</h1>
        <p className="mt-1 text-sm text-muted">
          A fresh set of 20 every day at midnight UAE time. Everyone gets the same questions, so scores are fair to compare.
        </p>
        {prizesRunning() && (
          <Link href="/prizes" className="mt-4 flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
            <span>
              Corporate Tax and VAT scores count towards this month&apos;s prizes: <b>an {PRIZE_GIFTS[0]}</b> for 1st.
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
        {newHere && (
          <Link href="/quiz/sample" className="mt-3 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm">
            <span>
              <b>New here?</b> Try 5 sample questions first. No sign-in needed.
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
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
