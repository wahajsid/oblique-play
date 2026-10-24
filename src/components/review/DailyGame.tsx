"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ObliqueMark } from "@/components/brand/ObliqueMark";
import { SiteFooter } from "@/components/SiteFooter";
import { ShareSheet } from "@/components/share/ShareSheet";
import { longDate, msUntilNextSet } from "@/lib/quiz/dates";
import type { CheckResult, PublicDocument, Verdict } from "@/lib/review/types";
import { FeedbackSheet } from "./FeedbackSheet";
import { TaxDocument, type DocMode, type Stamp } from "./TaxDocument";
import { ZoomSheet, describeTarget, type ZoomContent } from "./ZoomSheet";

type Phase = "deciding" | "selecting" | "checking" | "feedback" | "done";
const KEY = "oblique-play:daily";

// This device's record of daily results, so a signed-out player (or a quick
// revisit) sees today's result instead of the document again.
function loadLocal(): Record<string, boolean> {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveLocal(date: string, correct: boolean) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...loadLocal(), [date]: correct }));
  } catch {}
}

function untilTomorrow(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60_000));
  return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
}

type Props = {
  date: string;
  doc: PublicDocument;
  needsSignIn: boolean;
  // From the server: the signed-in player's result for today, if done.
  doneToday: { correct: boolean } | null;
  // "web": the public puzzle page linked from obliqueconsult.com
  // (/spot-the-error). No sign-in; its own header and next steps.
  variant?: "app" | "web";
};

export function DailyGame({ date, doc, needsSignIn, doneToday, variant = "app" }: Props) {
  const web = variant === "web";
  const [phase, setPhase] = useState<Phase>(doneToday ? "done" : "deciding");
  const [correct, setCorrect] = useState<boolean | null>(doneToday?.correct ?? null);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [stamp, setStamp] = useState<Stamp>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomContent | null>(null);
  const [sharing, setSharing] = useState(false);
  const [next, setNext] = useState<number | null>(null);
  const start = useRef(0);

  useEffect(() => {
    start.current = performance.now();
    const local = loadLocal()[date];
    if (!doneToday && local !== undefined) {
      setCorrect(local);
      setPhase("done");
    }
    setNext(msUntilNextSet());
    const id = window.setInterval(() => setNext(msUntilNextSet()), 30_000);
    return () => window.clearInterval(id);
  }, [date, doneToday]);

  // When the answer appears, bring the real issue into view above the sheet.
  useEffect(() => {
    if (phase !== "feedback" || result?.expected.verdict !== "off") return;
    const el = document.querySelector(`[data-part="${result.expected.targets[0]}"]`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 76, behavior: reduce ? "auto" : "smooth" });
  }, [phase, result]);

  const submit = async (verdict: Verdict, targetId?: string) => {
    if (needsSignIn) {
      window.location.assign(`/signin?next=${encodeURIComponent("/review/daily")}`);
      return;
    }
    const deskMs = performance.now() - start.current;
    setStamp(verdict);
    setPhase("checking");
    try {
      const res = await fetch("/api/review/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id, verdict, targetId, deskMs: Math.round(deskMs) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const checked = (await res.json()) as CheckResult;
      setResult(checked);
      setCorrect(checked.correct);
      saveLocal(date, checked.correct);
      setPhase("feedback");
    } catch {
      setStamp(null);
      setError("We couldn't check that one. Check your connection and try again.");
      setPhase(verdict === "off" ? "selecting" : "deciding");
    }
  };

  const onTap = (id: string, label: string) => {
    if (phase === "selecting") setSelected({ id, label });
    else if (phase !== "checking") setZoom(describeTarget(doc, id, label));
  };

  const header = web ? (
    <header className="flex h-14 items-center justify-between px-4">
      <a href="https://obliqueconsult.com" className="inline-flex min-h-11 items-center text-ink" aria-label="Oblique Consult">
        <ObliqueMark height={20} />
      </a>
      <Link href="/?utm_source=spot-the-error" className="inline-flex min-h-10 items-center rounded-full btn-primary px-4 text-sm font-semibold">
        Play the full game
      </Link>
    </header>
  ) : (
    <header className="flex h-14 items-center justify-between px-4">
      <Link href="/review" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted">
        <span aria-hidden="true">←</span> Shifts
      </Link>
      <ObliqueMark height={16} />
    </header>
  );
  const sharePath = web ? "/spot-the-error" : "/review/daily";

  if (phase === "done") {
    const message = `I checked today's UAE tax document in Oblique's learning game${correct ? " and spotted it" : ""}. Can you?`;
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col px-4 pt-4">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Today&apos;s document · {longDate(date)}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{correct ? "Spot on today." : "Not quite today."}</h1>
          <p className="mt-2 text-base text-muted">
            A new document arrives at midnight UAE time{next !== null && <>, in {untilTomorrow(next)}</>}. Same document for
            everyone, so you can compare.
          </p>
          {web ? (
            <div className="mt-8 flex flex-col gap-3 pb-safe">
              <Link href="/?utm_source=spot-the-error" className="rounded-2xl border border-line bg-surface p-5">
                <p className="text-xs font-semibold tracking-wide text-accent uppercase">Free · no app to install</p>
                <h2 className="mt-1 text-xl font-semibold">Play the full game</h2>
                <p className="mt-1 text-sm text-muted">
                  20 new Corporate Tax and VAT questions every day, three-minute document shifts, streaks and a leaderboard.
                </p>
                <span className="mt-4 inline-flex min-h-11 items-center rounded-full btn-primary px-4 text-sm font-semibold">Start playing</span>
              </Link>
              <button type="button" onClick={() => setSharing(true)} className="min-h-12 rounded-full border border-line px-4 text-sm font-semibold">
                Challenge a colleague
              </button>
              <form action="/diagnostic" method="post" target="_blank" className="rounded-2xl bg-accent-soft p-4 text-sm">
                <p>
                  <b>Questions about your own VAT?</b> Book a free 30-minute call with Oblique&apos;s tax team.
                </p>
                <button type="submit" className="mt-2 min-h-11 font-semibold underline underline-offset-2">
                  Book a free call
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
              <button type="button" onClick={() => setSharing(true)} className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold">
                Share today&apos;s document
              </button>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/review" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
                  Play a shift
                </Link>
                <Link href="/quiz" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
                  Daily quiz
                </Link>
              </div>
            </div>
          )}
        </main>
        <SiteFooter />
        {sharing && (
          <ShareSheet
            create={null}
            fallbackUrl={`${window.location.origin}${sharePath}`}
            title="Share today's document"
            message={message}
            subject="Today's UAE tax document, by Oblique"
            hasName
            onClose={() => setSharing(false)}
          />
        )}
      </>
    );
  }

  const mode: DocMode = phase === "selecting" ? "select" : phase === "deciding" ? "browse" : "reveal";
  const revealIds = result?.expected.verdict === "off" ? result.expected.targets : [];

  return (
    <>
      {header}
      <main className={`flex-1 px-4 pt-2 ${phase === "feedback" ? "pb-[80dvh]" : "pb-56"}`}>
        {web ? (
          <>
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">Spot the error · {longDate(date)}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-balance">Today&apos;s UAE tax document. Right, or is something off?</h1>
            <p className="mt-2 mb-4 text-sm text-muted">
              A free daily puzzle from Oblique. Check it like an auditor would: tap any part to look closer. Everyone gets the
              same document, and a new one arrives at midnight UAE time.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">Today&apos;s document · {longDate(date)}</p>
            <p className="mt-1 mb-4 text-sm text-muted">Everyone gets this one today. Does it look right, or is something off?</p>
          </>
        )}
        <div className="anim-slide-in">
          <TaxDocument doc={doc} mode={mode} selectedId={selected?.id ?? null} revealIds={revealIds} stamp={stamp} onTap={onTap} />
        </div>
        <SiteFooter />
      </main>

      {(phase === "deciding" || phase === "selecting" || phase === "checking") && (
        <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
          <div className="mx-auto max-w-md px-4 pt-3">
            {error && (
              <p role="alert" className="mb-2 rounded-lg bg-notquite-soft px-3 py-2 text-sm text-notquite">
                {error}
              </p>
            )}
            {phase === "selecting" ? (
              <>
                <p className="mb-2 text-sm font-medium" aria-live="polite">
                  {selected ? (
                    <>
                      Flag <span className="font-semibold">{selected.label}</span>?
                    </>
                  ) : (
                    "Tap the part that's off. If something's missing, tap where it should be."
                  )}
                </p>
                <div className="grid grid-cols-[auto_1fr] gap-2">
                  <button type="button" onClick={() => { setSelected(null); setPhase("deciding"); }} className="min-h-12 rounded-full border border-line px-4 text-sm font-semibold">
                    Back
                  </button>
                  <button type="button" disabled={!selected} onClick={() => selected && submit("off", selected.id)} className="min-h-12 rounded-full btn-primary px-4 text-base font-semibold">
                    Flag it
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={phase === "checking"} onClick={() => submit("right")} className="min-h-14 rounded-full border-2 border-accent bg-surface px-3 text-base font-semibold text-accent disabled:opacity-60">
                  Looks right
                </button>
                <button type="button" disabled={phase === "checking"} onClick={() => { setPhase("selecting"); setError(null); }} className="min-h-14 rounded-full btn-primary px-3 text-base font-semibold">
                  Something&apos;s off
                </button>
              </div>
            )}
            {needsSignIn && <p className="mt-2 text-center text-xs text-muted">You&apos;ll sign in with your email to see the answer.</p>}
          </div>
        </div>
      )}

      {phase === "feedback" && result && <FeedbackSheet result={result} isLast onNext={() => setPhase("done")} />}
      {zoom && <ZoomSheet content={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}
