import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { isPlayTrack, TRACKS } from "@/lib/quiz/content";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import { getLeaderboard, type Period } from "@/lib/quiz/leaderboard";
import type { PlayTrack } from "@/lib/quiz/types";
import { prizesRunning } from "@/lib/prizes";
import { formatTime } from "@/lib/review/progress";

export const metadata = { title: "Leaderboard · by Oblique" };
export const dynamic = "force-dynamic";

type Search = { track?: string; period?: string };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Search> }) {
  const q = await searchParams;
  const track: PlayTrack = q.track && isPlayTrack(q.track) ? q.track : "ct";
  const period: Period = q.period === "month" ? "month" : "today";
  const rows = await getLeaderboard(track, period);
  const today = uaeToday();
  const monthName = new Date(`${today}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  const tab = (active: boolean) =>
    `inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium ${active ? "border-accent bg-accent text-bg" : "border-line"}`;

  return (
    <>
      <AppHeader back={{ href: "/quiz", label: "Quiz" }} />
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Leaderboard</h1>
        <p className="mt-1 text-sm text-muted">
          {period === "today" ? `Today's scored rounds, ${longDate(today)}.` : `Total points from scored rounds in ${monthName}.`} Higher
          score first; time breaks ties.
        </p>

        {prizesRunning() && (
          <Link href="/prizes" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-2">
            Monthly prize standings →
          </Link>
        )}

        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Track">
          {(Object.keys(TRACKS) as PlayTrack[]).map((t) => (
            <Link key={t} href={`/quiz/leaderboard?track=${t}&period=${period}`} className={tab(t === track)} aria-current={t === track ? "page" : undefined}>
              {TRACKS[t].short}
            </Link>
          ))}
        </nav>
        <nav className="mt-2 flex gap-2" aria-label="Period">
          <Link href={`/quiz/leaderboard?track=${track}&period=today`} className={tab(period === "today")} aria-current={period === "today" ? "page" : undefined}>
            Today
          </Link>
          <Link href={`/quiz/leaderboard?track=${track}&period=month`} className={tab(period === "month")} aria-current={period === "month" ? "page" : undefined}>
            This month
          </Link>
        </nav>

        {rows === null ? (
          <p className="mt-6 text-sm text-muted">The leaderboard appears once sign-in is switched on.</p>
        ) : rows.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No scores yet. Be the first.</p>
        ) : (
          <ol className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface">
            {rows.map((r, i) => (
              <li
                key={`${r.rank}-${r.name}-${i}`}
                className={`flex min-h-12 items-center gap-3 px-4 text-sm ${r.isMe ? "bg-accent-soft font-semibold" : ""} ${
                  i > 0 && r.rank > rows[i - 1].rank + 1 ? "border-t-4 border-t-line" : ""
                }`}
              >
                <span className="w-7 text-right tabular-nums text-muted">{r.rank}</span>
                <span className="flex-1 truncate">
                  {r.name}
                  {r.isMe && <span className="ml-1 text-xs text-muted">(you)</span>}
                </span>
                <span className="tabular-nums">{r.score}</span>
                <span className="w-12 text-right text-xs text-muted tabular-nums">{formatTime(r.timeMs)}</span>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-4 text-xs text-muted">
          Players choose how they appear: their display name or a random anonymous name.{" "}
          <Link href="/profile" className="underline underline-offset-2">
            Change yours
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
