import { longDate, uaeToday } from "@/lib/quiz/dates";
import { isLaunched, LAUNCH_DATE } from "@/lib/launch";
import { siteUrl } from "@/lib/supabase/config";

export const metadata = { title: "Spot the error · Oblique", robots: { index: false } };
export const dynamic = "force-dynamic";

// A small "test yourself" box for obliqueconsult.com. In Framer, add an
// Embed (URL) pointing here; it fills whatever size the Embed is given.
// It opens the puzzle in a new tab, because the puzzle works best full-size.
export default function SpotTheErrorEmbed() {
  const today = uaeToday();
  const live = isLaunched(today);
  return (
    <>
      <style>{`
        html, body { background: transparent !important; }
        body > div { max-width: none !important; min-height: 0 !important; margin: 0 !important; }
      `}</style>
      <a
        href={`${siteUrl}/spot-the-error?utm_source=website`}
        target="_blank"
        rel="noopener"
        className="relative flex h-dvh min-h-[180px] w-full flex-col justify-between overflow-hidden rounded-2xl bg-[#141428] p-5 text-white"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-1/2"
          style={{ background: "repeating-linear-gradient(115deg, transparent 0 26px, rgba(173,235,242,.10) 26px 40px)" }}
        />
        <span className="relative">
          <span className="block text-xs font-semibold tracking-[0.14em] text-[#adebf2] uppercase">
            Spot the error{live && ` · ${longDate(today)}`}
          </span>
          <span className="mt-2 block text-xl leading-tight font-semibold text-balance">
            {live ? "Can you spot what's wrong with today's UAE tax document?" : `A new UAE tax puzzle every day, from ${longDate(LAUNCH_DATE)}.`}
          </span>
        </span>
        <span className="relative mt-4 flex items-center justify-between gap-3">
          <span className="btn-primary inline-flex min-h-11 items-center rounded-full px-5 text-sm font-semibold">
            {live ? "Test yourself →" : "Take a look →"}
          </span>
          <span className="text-xs text-[#c9cadb]">Free · 1 minute</span>
        </span>
      </a>
    </>
  );
}
