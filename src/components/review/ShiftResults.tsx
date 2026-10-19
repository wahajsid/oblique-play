"use client";

import Link from "next/link";
import { useState } from "react";
import { ObliqueWordmark } from "@/components/brand/ObliqueMark";
import { SiteFooter } from "@/components/SiteFooter";
import { formatTime, type AnswerRecord } from "@/lib/review/progress";
import type { ShiftInfo } from "@/lib/review/types";

function headline(score: number, total: number) {
  if (score === total) return "A perfect desk.";
  if (score >= total * 0.8) return "Sharp eyes.";
  if (score >= total * 0.5) return "Good shift. A few to revisit.";
  return "Every shift teaches something. Try it again.";
}

export function ShiftResults({
  shift,
  answers,
  deskMs,
  isBest,
  onReplay,
}: {
  shift: ShiftInfo;
  answers: AnswerRecord[];
  deskMs: number;
  isBest: boolean;
  onReplay: () => void;
}) {
  const total = answers.length;
  const score = answers.filter((a) => a.correct).length;
  const accuracy = total ? Math.round((score / total) * 100) : 0;
  const [shareNote, setShareNote] = useState<string | null>(null);

  // Full share cards and challenge links arrive on build day 8. For now this
  // uses the phone's own share menu, or copies the message on desktop.
  const share = async () => {
    const text = `I scored ${score}/${total} on Shift ${shift.number} (${shift.title}) of Oblique's UAE tax learning game. Can you beat me?`;
    const url = `${window.location.origin}/review/${shift.number}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "UAE Tax Learning Game by Oblique", text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareNote("Message and link copied.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setShareNote("Couldn't share from this browser.");
    }
  };

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
      <main className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          Shift {shift.number} complete
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{headline(score, total)}</h1>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <Stat label="Score" value={`${score}/${total}`} />
          <Stat label="Accuracy" value={`${accuracy}%`} />
          <Stat label="Desk time" value={formatTime(deskMs)} />
        </div>
        {isBest && <p className="mt-3 text-center text-sm font-medium text-ok">Your best on this shift so far.</p>}

        <ol className="mt-6 flex justify-center gap-2" aria-label="Your answers, document by document">
          {answers.map((a, i) => (
            <li
              key={a.docId}
              aria-label={`Document ${i + 1}: ${a.correct ? "spot on" : "not quite"}`}
              className={`size-5 rounded-full border-2 ${a.correct ? "border-ok bg-ok" : "border-notquite bg-transparent"}`}
            />
          ))}
        </ol>

        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          <button
            type="button"
            onClick={share}
            className="min-h-14 rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
          >
            Share my score
          </button>
          {shareNote && (
            <p role="status" className="text-center text-sm text-muted">
              {shareNote}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onReplay} className="min-h-12 rounded-xl border border-line text-sm font-semibold">
              Play again
            </button>
            <Link
              href="/review"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line text-sm font-semibold"
            >
              All shifts
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-2 py-3">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}
