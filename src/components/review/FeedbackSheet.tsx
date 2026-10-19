"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckResult } from "@/lib/review/types";

// Gentle feedback: no red, no crosses. Both outcomes get the same explanation.
export function FeedbackSheet({
  result,
  isLast,
  onNext,
}: {
  result: CheckResult;
  isLast: boolean;
  onNext: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const nextRef = useRef<HTMLButtonElement>(null);
  useEffect(() => nextRef.current?.focus({ preventScroll: true }), []);

  const { correct, expected, explanation } = result;
  const answerLine =
    expected.verdict === "off" ? (
      <>
        The issue: <span className="font-semibold">{expected.targetLabel}</span>
      </>
    ) : (
      "This document is correct as it stands."
    );

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="feedback-title"
      className="anim-sheet-up pb-safe fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t border-line bg-surface shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.3)]"
    >
      <div className="mx-auto max-w-md px-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div aria-live="polite">
            <h2 id="feedback-title" className={`text-xl font-semibold ${correct ? "text-ok" : "text-notquite"}`}>
              {correct ? "Spot on." : "Not quite."}
            </h2>
            <p className="mt-0.5 text-sm">{answerLine}</p>
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-expanded={!collapsed}
            className="-mr-2 min-h-11 shrink-0 rounded-lg px-3 text-sm font-medium text-muted"
          >
            {collapsed ? "Show why" : "See document"}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-3 max-h-[42dvh] space-y-3 overflow-y-auto text-[15px] leading-relaxed">
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">What</h3>
              <p className="mt-0.5">{explanation.what}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Why</h3>
              <p className="mt-0.5">{explanation.why}</p>
            </section>
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Reference</h3>
              <p className="mt-0.5 text-sm text-muted">{explanation.reference}</p>
            </section>
          </div>
        )}

        <button
          ref={nextRef}
          type="button"
          onClick={onNext}
          className="mt-4 min-h-14 w-full rounded-xl bg-accent px-4 text-base font-semibold text-accent-ink"
        >
          {isLast ? "See results" : "Next document"}
        </button>
      </div>
    </div>
  );
}
