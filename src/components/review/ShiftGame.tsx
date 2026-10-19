"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ObliqueWordmark } from "@/components/brand/ObliqueMark";
import { SiteFooter } from "@/components/SiteFooter";
import {
  clearRun,
  formatTime,
  getRun,
  recordFinish,
  saveRun,
  type AnswerRecord,
  type ShiftRun,
} from "@/lib/review/progress";
import type { CheckResult, PublicDocument, ShiftInfo, Verdict } from "@/lib/review/types";
import { FeedbackSheet } from "./FeedbackSheet";
import { ShiftResults } from "./ShiftResults";
import { TaxDocument, type DocMode, type Stamp } from "./TaxDocument";
import { ZoomSheet, describeTarget, type ZoomContent } from "./ZoomSheet";

// intro → deciding → (selecting) → checking → feedback → next document … → done
type Phase = "intro" | "deciding" | "selecting" | "checking" | "feedback" | "done";

// A light tap on Android. iPhones ignore this; websites can't vibrate them.
const buzz = () => {
  try {
    navigator.vibrate?.(12);
  } catch {}
};

export function ShiftGame({ shift, documents }: { shift: ShiftInfo; documents: PublicDocument[] }) {
  const total = documents.length;
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [startedAt, setStartedAt] = useState(0);
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(null);
  const [stamp, setStamp] = useState<Stamp>(null);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomContent | null>(null);
  const [savedRun, setSavedRun] = useState<ShiftRun | null>(null);
  const [isBest, setIsBest] = useState(false);

  // Desk time counts only while a document is waiting for a decision.
  // Reading the explanation doesn't count against the player.
  const docStart = useRef(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const run = getRun(shift.number);
    if (run && run.answers.length > 0 && run.answers.length < total) setSavedRun(run);
  }, [shift.number, total]);

  const timing = phase === "deciding" || phase === "selecting";
  useEffect(() => {
    if (!timing) return;
    const id = window.setInterval(() => setTick(performance.now()), 500);
    return () => window.clearInterval(id);
  }, [timing]);

  // When the answer appears, bring the real issue into view above the sheet.
  useEffect(() => {
    if (phase !== "feedback" || result?.expected.verdict !== "off") return;
    const el = document.querySelector(`[data-part="${result.expected.targets[0]}"]`);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
  }, [phase, result]);

  const doc = documents[index];
  const doneMs = answers.reduce((sum, a) => sum + a.deskMs, 0);
  const deskMs = doneMs + (timing && tick ? Math.max(0, tick - docStart.current) : 0);

  const showDocument = useCallback((i: number) => {
    setIndex(i);
    setSelected(null);
    setStamp(null);
    setResult(null);
    setError(null);
    setPhase("deciding");
    docStart.current = performance.now();
    setTick(0);
    window.scrollTo({ top: 0 });
  }, []);

  const start = (resume: boolean) => {
    if (resume && savedRun) {
      setAnswers(savedRun.answers);
      setStartedAt(savedRun.startedAt);
      showDocument(savedRun.answers.length);
    } else {
      clearRun(shift.number);
      setAnswers([]);
      setStartedAt(Date.now());
      showDocument(0);
    }
    setSavedRun(null);
  };

  const submit = async (verdict: Verdict, targetId?: string) => {
    const thisDocMs = performance.now() - docStart.current;
    setStamp(verdict);
    setPhase("checking");
    buzz();
    try {
      const res = await fetch("/api/review/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id, verdict, targetId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const checked = (await res.json()) as CheckResult;
      const next = [...answers, { docId: doc.id, correct: checked.correct, deskMs: thisDocMs }];
      setAnswers(next);
      saveRun({ shift: shift.number, answers: next, startedAt });
      setResult(checked);
      setPhase("feedback");
    } catch {
      setStamp(null);
      setError("We couldn't check that one. Check your connection and try again.");
      setPhase(verdict === "off" ? "selecting" : "deciding");
    }
  };

  const goNext = () => {
    if (index + 1 < total) {
      showDocument(index + 1);
      return;
    }
    const score = answers.filter((a) => a.correct).length;
    setIsBest(recordFinish(shift.number, { score, total, deskMs: doneMs, completedAt: Date.now() }));
    setPhase("done");
    window.scrollTo({ top: 0 });
  };

  const onTap = (id: string, label: string) => {
    if (phase === "selecting") {
      setSelected({ id, label });
      buzz();
    } else if (phase !== "checking") {
      setZoom(describeTarget(doc, id, label));
    }
  };

  if (phase === "intro") {
    return (
      <Intro
        shift={shift}
        total={total}
        resumeAt={savedRun ? savedRun.answers.length + 1 : null}
        onStart={start}
      />
    );
  }

  if (phase === "done") {
    return (
      <ShiftResults
        shift={shift}
        answers={answers}
        deskMs={doneMs}
        isBest={isBest}
        onReplay={() => start(false)}
      />
    );
  }

  const mode: DocMode = phase === "selecting" ? "select" : phase === "deciding" ? "browse" : "reveal";
  const revealIds = result?.expected.verdict === "off" ? result.expected.targets : [];

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/95 px-4 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link
            href="/review"
            className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted"
          >
            <span aria-hidden="true">←</span> Shifts
          </Link>
          <p className="text-sm font-medium tabular-nums" aria-label={`Document ${index + 1} of ${total}`}>
            {index + 1} / {total}
          </p>
          <p className="min-w-12 text-right text-sm text-muted tabular-nums" aria-label="Desk time">
            {formatTime(deskMs)}
          </p>
          <ObliqueWordmark className="text-sm" />
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full bg-accent transition-[width] duration-300"
            style={{ width: `${((index + (result ? 1 : 0)) / total) * 100}%` }}
          />
        </div>
      </header>

      {/* Extra room at the bottom lets any part of the document scroll up above the sheet. */}
      <main className={`flex-1 px-4 pt-4 ${phase === "feedback" ? "pb-[80dvh]" : "pb-56"}`}>
        <div key={doc.id} className="anim-slide-in">
          <TaxDocument
            doc={doc}
            mode={mode}
            selectedId={selected?.id ?? null}
            revealIds={revealIds}
            stamp={stamp}
            onTap={onTap}
          />
        </div>
        {phase === "deciding" && (
          <p className="mt-3 text-center text-xs text-muted">Tap any part of the document to zoom in.</p>
        )}
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
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(null);
                      setPhase("deciding");
                    }}
                    className="min-h-12 rounded-xl border border-line px-4 text-sm font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selected}
                    onClick={() => selected && submit("off", selected.id)}
                    className="min-h-12 rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink disabled:opacity-40"
                  >
                    Flag it
                  </button>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={phase === "checking"}
                  onClick={() => submit("right")}
                  className="min-h-14 rounded-xl border-2 border-accent bg-surface px-3 text-base font-semibold text-accent disabled:opacity-60"
                >
                  Looks right
                </button>
                <button
                  type="button"
                  disabled={phase === "checking"}
                  onClick={() => {
                    setPhase("selecting");
                    setError(null);
                  }}
                  className="min-h-14 rounded-xl bg-accent px-3 text-base font-semibold text-accent-ink disabled:opacity-60"
                >
                  Something&apos;s off
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {phase === "feedback" && result && (
        <FeedbackSheet result={result} isLast={index + 1 >= total} onNext={goNext} />
      )}

      {zoom && <ZoomSheet content={zoom} onClose={() => setZoom(null)} />}
    </>
  );
}

function Intro({
  shift,
  total,
  resumeAt,
  onStart,
}: {
  shift: ShiftInfo;
  total: number;
  resumeAt: number | null;
  onStart: (resume: boolean) => void;
}) {
  return (
    <>
      <header className="flex h-14 items-center justify-between px-4">
        <Link
          href="/review"
          className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted"
        >
          <span aria-hidden="true">←</span> Shifts
        </Link>
        <ObliqueWordmark className="text-sm" />
      </header>
      <main className="flex flex-1 flex-col px-4 pt-6">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Shift {shift.number}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{shift.title}</h1>
        <p className="mt-2 text-base text-muted">{shift.summary}</p>

        <ol className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <li><span className="font-semibold">1.</span> A document lands on your desk.</li>
          <li><span className="font-semibold">2.</span> Tap <span className="font-semibold">Looks right</span> or <span className="font-semibold">Something&apos;s off</span>.</li>
          <li><span className="font-semibold">3.</span> If something&apos;s off, tap the part with the problem.</li>
          <li><span className="font-semibold">4.</span> See the rule and why it applies.</li>
        </ol>
        <p className="mt-3 text-sm text-muted">
          {total} documents. The clock only runs while a document is waiting for you.
        </p>

        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          {resumeAt && (
            <button
              type="button"
              onClick={() => onStart(true)}
              className="min-h-14 rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
            >
              Pick up at document {resumeAt}
            </button>
          )}
          <button
            type="button"
            onClick={() => onStart(false)}
            className={
              resumeAt
                ? "min-h-12 rounded-xl border border-line px-4 text-sm font-semibold"
                : "min-h-14 rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
            }
          >
            {resumeAt ? "Start again" : "Start shift"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
