"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ObliqueMark } from "@/components/brand/ObliqueMark";
import { SiteFooter } from "@/components/SiteFooter";
import { track } from "@/lib/analytics";
import type { QuizCheckResult } from "@/lib/quiz/types";
import type { GameQuestion } from "./QuizGame";

const LETTERS = ["A", "B", "C", "D"];

// Five sample questions anyone can play without signing in: a taste of the
// daily quiz before being asked for an email. Nothing is saved.
export function SampleQuiz({ questions, prize }: { questions: GameQuestion[]; prize: string | null }) {
  const total = questions.length;
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reply, setReply] = useState<QuizCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reply) feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [reply]);

  const header = (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 bg-bg/95 px-4 backdrop-blur">
      <Link href="/" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted">
        <span aria-hidden="true">←</span> Home
      </Link>
      {!done && (
        <p className="text-sm font-medium tabular-nums" aria-label={`Sample question ${index + 1} of ${total}`}>
          {index + 1} / {total}
        </p>
      )}
      <ObliqueMark height={16} />
    </header>
  );

  if (done) {
    return (
      <>
        {header}
        <main className="flex flex-1 flex-col px-4 pt-6">
          <p className="text-sm font-semibold tracking-wide text-accent uppercase">Sample round</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight" data-testid="sample-score">
            {score} out of {total}.
          </h1>
          <p className="mt-2 text-base text-muted">
            {score === total ? "A clean sheet. " : score >= 3 ? "A good start. " : "That's what the game is for. "}
            Today&apos;s real quiz is 20 fresh questions, the same for everyone, with a leaderboard.
          </p>
          {prize && (
            <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              This month&apos;s top player wins <b>an {prize}</b>.
            </p>
          )}
          <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
            <Link href="/signin?next=/quiz&src=sample" className="flex min-h-14 items-center justify-center rounded-full btn-primary px-4 text-base font-semibold">
              Play today&apos;s quiz
            </Link>
            <p className="text-center text-xs text-muted">Free. Sign in with just your email to save your score.</p>
            <Link href="/spot-the-error" className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
              Or spot the error in today&apos;s document
            </Link>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const q = questions[index];
  const isSpot = q.format === "spot_issue";

  const check = async () => {
    if (choice === null) return;
    setChecking(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: true, questionId: q.id, choice }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as QuizCheckResult;
      if (index === 0) track("sample_started");
      setReply(r);
      if (r.correct) setScore((s) => s + 1);
    } catch {
      setError("We couldn't check that one. Check your connection and try again.");
    }
    setChecking(false);
  };

  const next = () => {
    if (index + 1 >= total) {
      track("sample_finished", { score });
      setDone(true);
    } else {
      setIndex(index + 1);
      setChoice(null);
      setReply(null);
    }
    window.scrollTo({ top: 0 });
  };

  const optionClass = (i: number) => {
    const base = "flex w-full min-h-14 items-start gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors";
    if (reply) {
      if (i === reply.answerIndex) return `${base} border-ok bg-ok-soft font-medium`;
      if (i === choice) return `${base} border-notquite border-dashed bg-notquite-soft`;
      return `${base} border-line opacity-70`;
    }
    if (i === choice) return `${base} border-accent bg-accent-soft ring-2 ring-accent`;
    return `${base} border-line bg-surface hover:border-accent`;
  };

  return (
    <>
      {header}
      <main className="flex-1 px-4 pt-2 pb-32">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">Sample · {q.topicLabel}</p>
        {q.scenario && <p className="mt-3 rounded-2xl border border-paper-line bg-paper p-4 text-[15px] leading-relaxed text-paper-ink">{q.scenario}</p>}
        <h1 className="mt-4 text-xl leading-snug font-semibold">{q.prompt}</h1>
        <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Answers">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={choice === i}
              disabled={!!reply || checking}
              onClick={() => setChoice(i)}
              className={optionClass(i)}
            >
              {q.format !== "true_false" && (
                <span className="mt-px shrink-0 font-semibold text-muted" aria-hidden="true">
                  {isSpot ? `${i + 1}.` : LETTERS[i]}
                </span>
              )}
              <span>{opt}</span>
              {reply && i === reply.answerIndex && <span className="sr-only"> (correct answer)</span>}
            </button>
          ))}
        </div>

        {reply && (
          <div ref={feedbackRef} className="mt-5 scroll-mt-20 rounded-2xl border border-line bg-surface p-4" aria-live="polite">
            <h2 className={`text-xl font-semibold ${reply.correct ? "text-ok" : "text-notquite"}`}>{reply.correct ? "Spot on." : "Not quite."}</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">What</h3>
                <p className="mt-0.5">{reply.explanation.what}</p>
              </section>
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Why</h3>
                <p className="mt-0.5">{reply.explanation.why}</p>
              </section>
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-muted uppercase">Reference</h3>
                <p className="mt-0.5 text-sm text-muted">{reply.explanation.reference}</p>
              </section>
            </div>
          </div>
        )}
        <SiteFooter />
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pt-3">
          {error && (
            <p role="alert" className="mb-2 rounded-lg bg-notquite-soft px-3 py-2 text-sm text-notquite">
              {error}
            </p>
          )}
          {reply ? (
            <button type="button" onClick={next} className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold">
              {index + 1 >= total ? "See how you did" : "Next question"}
            </button>
          ) : (
            <button type="button" onClick={check} disabled={choice === null || checking} className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold">
              Check answer
            </button>
          )}
        </div>
      </div>
    </>
  );
}
