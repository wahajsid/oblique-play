import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getPastDates, TRACKS } from "@/lib/quiz/content";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import type { PlayTrack } from "@/lib/quiz/types";

export const metadata = { title: "Past quiz sets · by Oblique" };
export const dynamic = "force-dynamic";

export default function ArchivePage() {
  const today = uaeToday();
  const dates = getPastDates();
  const tracks = Object.keys(TRACKS) as PlayTrack[];

  return (
    <>
      <AppHeader back={{ href: "/quiz", label: "Quiz" }} />
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Past sets</h1>
        <p className="mt-1 text-sm text-muted">Every daily set stays here. Past sets are for practice; scores count only on the day.</p>
        {dates.length === 0 ? (
          <p className="mt-6 text-sm text-muted">No sets yet.</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {dates.map((date) => (
              <li key={date} className="rounded-2xl border border-line bg-surface p-4">
                <h2 className="font-semibold">
                  {longDate(date)}
                  {date === today && <span className="ml-2 text-xs font-medium text-ok">Today</span>}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {tracks.map((t) => (
                    <Link
                      key={t}
                      href={`/quiz/${t}/${date}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-accent"
                    >
                      {TRACKS[t].short}
                    </Link>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
