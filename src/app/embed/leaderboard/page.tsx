import { isLaunched, LAUNCH_DATE } from "@/lib/launch";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import { getMonthlyTop, type MonthlyTop } from "@/lib/quiz/leaderboard";
import { currentMonth, formatAed, monthName, PRIZE_RULES } from "@/lib/prizes";
import { authEnabled, siteUrl } from "@/lib/supabase/config";

export const metadata = { title: "Leaderboard · Oblique", robots: { index: false } };
export const dynamic = "force-dynamic";

// A small "top 5 this month" box for obliqueconsult.com. In Framer, add an
// Embed (URL) pointing here, about 300 wide and 340 tall. ?theme=light for a
// white section of the site. The numbers are cached for 5 minutes, so every
// visitor shares one database read.
export default async function LeaderboardEmbed({ searchParams }: { searchParams: Promise<{ theme?: string }> }) {
  const light = (await searchParams).theme === "light";
  const today = uaeToday();
  const live = authEnabled && isLaunched(today);
  let top: MonthlyTop | null = null;
  if (live) top = await getMonthlyTop(5).catch(() => null);

  const prizes = top?.board === "prizes";
  const href = `${siteUrl}${prizes ? "/prizes" : "/quiz"}?utm_source=website`;
  const c = light
    ? { card: "bg-white text-[#141428] border border-[#dfe0e4]", eyebrow: "text-[#3c3c7f]", muted: "text-[#5f6170]", line: "divide-[#eceef1]", badge: "bg-[#e6f9fb] text-[#141428]" }
    : { card: "bg-[#141428] text-white", eyebrow: "text-[#adebf2]", muted: "text-[#c9cadb]", line: "divide-white/10", badge: "bg-[#adebf2] text-[#141428]" };

  return (
    <>
      <style>{`
        html, body { background: transparent !important; }
        body > div { max-width: none !important; min-height: 0 !important; margin: 0 !important; }
      `}</style>
      <a
        href={href}
        target="_blank"
        rel="noopener"
        className={`relative flex h-dvh min-h-[260px] w-full flex-col overflow-hidden rounded-2xl p-5 ${c.card}`}
        data-testid="leaderboard-box"
      >
        {!light && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-2/5"
            style={{ background: "repeating-linear-gradient(115deg, transparent 0 26px, rgba(173,235,242,.08) 26px 40px)" }}
          />
        )}
        <span className="relative">
          <span className={`block text-xs font-semibold tracking-[0.14em] uppercase ${c.eyebrow}`}>
            {prizes ? "Monthly prizes" : "Leaderboard"} · {monthName(currentMonth()).split(" ")[0]}
          </span>
          <span className="mt-1 block text-lg leading-tight font-semibold">
            {prizes ? `${formatAed(PRIZE_RULES.amountsAed[0])} for 1st place` : "Top UAE tax players this month"}
          </span>
        </span>

        <span className="relative mt-3 flex min-h-0 flex-1 flex-col">
          {!live ? (
            <span className={`my-auto text-sm ${c.muted}`}>The leaderboard opens on {longDate(LAUNCH_DATE)}, with the first daily quiz.</span>
          ) : !top ? (
            <span className={`my-auto text-sm ${c.muted}`}>The leaderboard is taking a break. Please check back soon.</span>
          ) : top.rows.length === 0 ? (
            <span className={`my-auto text-sm ${c.muted}`}>No scores yet this month. Be the first on the board.</span>
          ) : (
            <ol className={`divide-y ${c.line}`}>
              {top.rows.map((r, i) => (
                <li key={i} className="flex min-h-9 items-center gap-3 text-sm">
                  <span
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${r.rank <= 3 ? c.badge : c.muted}`}
                  >
                    {r.rank}
                  </span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <span className="font-semibold tabular-nums">{r.points}</span>
                </li>
              ))}
            </ol>
          )}
        </span>

        <span className="relative mt-3 flex items-center justify-between gap-3">
          <span className="btn-primary inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold">
            {live ? "Play today's quiz →" : "Take a look →"}
          </span>
          <span className={`text-xs ${c.muted}`}>Free</span>
        </span>
      </a>
    </>
  );
}
