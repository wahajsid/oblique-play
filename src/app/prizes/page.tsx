import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EnterPrize } from "@/components/prizes/EnterPrize";
import { InviteLink } from "@/components/prizes/InviteLink";
import { SiteFooter } from "@/components/SiteFooter";
import { longDate } from "@/lib/quiz/dates";
import {
  currentMonth,
  FIRST_PRIZE_MONTH,
  getMyPrizeStatus,
  getPrizeBoard,
  getWinners,
  isPrizeMonth,
  LAST_PRIZE_MONTH,
  lastDayOf,
  monthName,
  previousMonth,
  PRIZE_GIFTS,
  PRIZE_RULES,
  prizePhase,
  prizesEnabled,
} from "@/lib/prizes";
import { siteUrl } from "@/lib/supabase/config";

export const metadata = {
  title: "Monthly prizes · by Oblique",
  description: "Each month from December 2026 to February 2027, the top 3 players win an iPhone or Galaxy S26, AirPods or a power bank. Free to enter.",
};
export const dynamic = "force-dynamic";

const PLACES = ["1st", "2nd", "3rd"];

export default async function PrizesPage() {
  if (!prizesEnabled) notFound();
  const month = currentMonth();
  const phase = prizePhase(month);
  const running = phase === "running";
  const [me, board, lastWinners] = await Promise.all([
    getMyPrizeStatus(month),
    running ? getPrizeBoard(month) : Promise.resolve([]),
    isPrizeMonth(previousMonth(month)) ? getWinners(previousMonth(month)) : Promise.resolve([]),
  ]);
  const { referralPoints, referralCap } = PRIZE_RULES;
  const campaign = `${monthName(FIRST_PRIZE_MONTH)} to ${monthName(LAST_PRIZE_MONTH)}`;

  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4 pb-6">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">{running ? monthName(month) : campaign}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Monthly prizes</h1>
        <p className="mt-1 text-sm text-muted" data-testid="prize-intro">
          {phase === "running" && <>The top 3 players at the end of the month win. Ends {longDate(lastDayOf(month))}, midnight UAE time.</>}
          {phase === "before" && <>Every month from {campaign}, the top 3 players win. The first month starts on {longDate(FIRST_PRIZE_MONTH)}.</>}
          {phase === "after" && <>The prize campaign ran from {campaign}. Thank you to everyone who played. The game carries on, free.</>}
        </p>

        <ol className="mt-4 grid grid-cols-2 gap-2" aria-label="Prizes each month">
          {PRIZE_GIFTS.map((gift, i) => (
            <li
              key={i}
              className={`rounded-2xl border p-3 ${i === 0 ? "col-span-2 border-accent bg-accent-soft" : "border-line bg-surface"}`}
            >
              <p className="text-xs font-semibold text-muted">{PLACES[i]}</p>
              <p className={`mt-0.5 font-semibold ${i === 0 ? "text-2xl" : "text-lg"}`}>{gift}</p>
            </li>
          ))}
        </ol>

{phase !== "after" && (
          <>
        <section className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <h2 className="font-semibold">How points work</h2>
          <ul className="mt-2 space-y-2 text-sm text-muted">
            <li>
              <b className="text-ink">1 point per correct answer</b> in your first go at each day&apos;s Corporate Tax and VAT
              quizzes. That&apos;s up to 40 a day. &quot;Both&quot;, practice rounds and past days don&apos;t count.
            </li>
            <li>
              <b className="text-ink">+{referralPoints} points per friend</b> who signs up with your link and finishes a
              daily quiz, up to {referralCap} friends ({referralPoints * referralCap} points) a month.
            </li>
            <li>Tied? More quiz points wins, then the faster total time.</li>
          </ul>
        </section>
          </>
        )}

{phase !== "after" && (
          <>
        {me ? (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-4" aria-labelledby="you">
            {running ? (
              <>
                <h2 id="you" className="font-semibold">
                  Your {monthName(month)}
                </h2>
                <p className="mt-2 text-4xl font-semibold tabular-nums" data-testid="my-points">
                  {me.points}
                  <span className="ml-1 text-base font-medium text-muted">points</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  Quiz {me.quizPoints} + friends {me.referralPoints}
                  {me.referrals > referralCap && ` (${me.referrals} friends; the first ${referralCap} count)`}
                  {me.rank !== null && <> · you&apos;re <b className="text-ink">#{me.rank}</b></>}
                </p>
              </>
            ) : (
              <h2 id="you" className="font-semibold">
                Enter before {longDate(FIRST_PRIZE_MONTH)}
              </h2>
            )}
            {me.excluded ? (
              <p className="mt-4 rounded-xl bg-notquite-soft px-3 py-2 text-sm text-notquite">
                Oblique staff and reviewers can play, but can&apos;t win prizes.
              </p>
            ) : (
              <EnterPrize entered={me.entered} />
            )}
          </section>
        ) : (
          <Link href="/signin?next=/prizes" className="mt-4 flex min-h-12 items-center justify-center rounded-full btn-primary text-sm font-semibold">
            Sign in to enter
          </Link>
        )}

        {me && (
          <section className="mt-4 rounded-2xl border border-line bg-surface p-4" aria-labelledby="invite">
            <h2 id="invite" className="font-semibold">
              Invite friends, +{referralPoints} points each
            </h2>
            <p className="mt-1 text-sm text-muted">
              {running ? `${Math.min(me.referrals, referralCap)} of ${referralCap} counted this month. ` : "Friends count from the first prize month. "}
              Challenge links you share after a quiz count too.
            </p>
            <InviteLink url={`${siteUrl}/i/${me.inviteCode}`} />
          </section>
        )}
          </>
        )}

{running && (
          <>
        <h2 className="mt-6 font-semibold">Standings</h2>
        {board.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line p-4 text-sm text-muted">No one has entered yet. Be the first.</p>
        ) : (
          <ol className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface" data-testid="prize-board">
            {board.map((r, i) => (
              <li
                key={`${r.rank}-${r.name}-${i}`}
                className={`flex min-h-12 items-center gap-3 px-4 text-sm ${r.isMe ? "bg-accent-soft font-semibold" : ""} ${
                  i > 0 && r.rank > board[i - 1].rank + 1 ? "border-t-4 border-t-line" : ""
                }`}
              >
                <span className="w-7 text-right tabular-nums text-muted">{r.rank}</span>
                <span className="flex-1 truncate">
                  {r.name}
                  {r.isMe && <span className="ml-1 text-xs text-muted">(you)</span>}
                </span>
                {r.referralPoints > 0 && <span className="text-xs text-muted tabular-nums">+{r.referralPoints}</span>}
                <span className="w-12 text-right tabular-nums">{r.points}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-2 text-xs text-muted">
          Only players who&apos;ve entered appear here, under the name they chose.{" "}
          <Link href="/profile" className="underline underline-offset-2">
            Change yours
          </Link>
          .
        </p>
          </>
        )}

        {lastWinners.length > 0 && (
          <section className="mt-6" aria-labelledby="winners">
            <h2 id="winners" className="font-semibold">
              {monthName(previousMonth(month))} winners
            </h2>
            <ul className="mt-2 divide-y divide-line rounded-2xl border border-line bg-surface">
              {lastWinners.map((w) => (
                <li key={w.place} className="flex min-h-12 items-center gap-3 px-4 text-sm">
                  <span className="w-8 text-muted">{PLACES[w.place - 1]}</span>
                  <span className="flex-1 truncate font-medium">{w.name}</span>
                  <span className="text-muted">{w.prize}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="mt-6 text-sm">
          <Link href="/prizes/rules" className="font-medium underline underline-offset-2">
            Full prize rules
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
