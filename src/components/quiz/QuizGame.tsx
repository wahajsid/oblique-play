"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ObliqueMark } from "@/components/brand/ObliqueMark";
import { ReportProblem } from "@/components/ReportProblem";
import { track as trackEvent } from "@/lib/analytics";
import { ChallengeBanner, type ChallengeInfo } from "@/components/share/Challenge";
import type { PlayerProfile, PlayerStats } from "@/lib/players";
import { SiteFooter } from "@/components/SiteFooter";
import { longDate } from "@/lib/quiz/dates";
import {
  clearQuizRun,
  getQuizResult,
  getQuizRun,
  recordQuizResult,
  runKey,
  saveQuizRun,
  type QuizAnswer,
  type QuizRun,
} from "@/lib/quiz/progress";
import { formatTime } from "@/lib/review/progress";
import type { PlayTrack, PublicQuestion, QuizCheckResult } from "@/lib/quiz/types";
import { QuizResults } from "./QuizResults";

export type GameQuestion = PublicQuestion & { topicLabel: string };

type Phase = "intro" | "answering" | "checking" | "feedback" | "done";
type CheckReply = QuizCheckResult & { scored: boolean | null };

const LEVEL: Record<GameQuestion["difficulty"], string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
const LETTERS = ["A", "B", "C", "D"];

const buzz = () => {
  try {
    navigator.vibrate?.(12);
  } catch {}
};

type Props = {
  track: PlayTrack;
  trackTitle: string;
  date: string;
  isToday: boolean;
  questions: GameQuestion[];
  needsSignIn: boolean;
  signedIn: boolean;
  draft: boolean;
  // From the server, for signed-in players: today's scored round on this
  // track was already started (maybe on another device) or finished.
  serverScored: "none" | "started" | "finished";
  profile: PlayerProfile | null;
  // Set when the quiz was opened from someone's challenge link.
  challenge: ChallengeInfo | null;
};

export function QuizGame(props: Props) {
  const { track, trackTitle, date, isToday, questions, needsSignIn, signedIn, draft, serverScored, profile, challenge } = props;
  const key = runKey(track, date);
  const total = questions.length;
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [attemptId, setAttemptId] = useState("");
  const attemptRef = useRef("");
  const [serverTimeMs, setServerTimeMs] = useState<number | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [reply, setReply] = useState<CheckReply | null>(null);
  const [scored, setScored] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedRun, setSavedRun] = useState<QuizRun | null>(null);
  // A finished scored round is known on the server, so the first render
  // already says "practice" instead of flashing "Start quiz".
  const [alreadyScored, setAlreadyScored] = useState(serverScored === "finished");
  const [stats, setStats] = useState<PlayerStats | null>(null);

  // Time counts only while a question is waiting for an answer.
  const qStart = useRef(0);
  const [tick, setTick] = useState(0);
  const feedbackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const run = getQuizRun(key);
    if (run?.attemptId && run.answers.length > 0 && run.answers.length < total) setSavedRun(run);
    setAlreadyScored(!!getQuizResult(key)?.scored || serverScored === "finished");
  }, [key, total, serverScored]);

  useEffect(() => {
    if (phase !== "answering") return;
    const id = window.setInterval(() => setTick(performance.now()), 500);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "feedback") feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [phase]);

  const q = questions[index];
  const doneMs = answers.reduce((s, a) => s + a.timeMs, 0);
  const elapsed = doneMs + (phase === "answering" && tick ? Math.max(0, tick - qStart.current) : 0);

  // The server can answer with a different attempt id: an unfinished scored
  // round carries on, whichever device asks.
  const adoptAttempt = (id: unknown, run: QuizAnswer[]) => {
    if (typeof id !== "string" || id === attemptRef.current) return;
    attemptRef.current = id;
    setAttemptId(id);
    saveQuizRun(key, { attemptId: id, answers: run, startedAt: startedAt || Date.now() });
  };

  // Posts to the quiz API. A session that is a fraction of a second old can
  // be refused once, so "not signed in" is retried before it's believed.
  const send = async (path: string, body: unknown) => {
    const go = () => fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    let res = await go();
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 900));
      res = await go();
    }
    return res;
  };

  // Sign-in has lapsed, or the mixed quiz isn't open yet: leave the round.
  const leaveIfBlocked = (status: number) => {
    if (status === 401) window.location.assign(`/signin?next=${encodeURIComponent(`/quiz/${track}/${date}`)}`);
    else if (status === 403) window.location.assign("/quiz");
    return status === 401 || status === 403;
  };

  const showQuestion = (i: number, run: QuizAnswer[] = answers) => {
    setIndex(i);
    setChoice(null);
    setReply(null);
    setError(null);
    setPhase("answering");
    qStart.current = performance.now();
    setTick(0);
    window.scrollTo({ top: 0 });
    // Starts this question's clock on the server (and the attempt, on its
    // first question). The time that counts is measured there.
    if (signedIn) {
      send("/api/quiz/shown", { date, track, questionId: questions[i].id, attemptId: attemptRef.current, challengeCode: challenge?.code })
        .then(async (res) => {
          if (leaveIfBlocked(res.status)) return;
          if (res.ok) adoptAttempt((await res.json()).attemptId, run);
        })
        .catch(() => {});
    }
  };

  const start = (resume: boolean) => {
    if (needsSignIn) {
      // From a challenge, sign-in returns through the challenge so it isn't lost.
      window.location.assign(
        challenge ? `/c/${challenge.code}/play` : `/signin?next=${encodeURIComponent(`/quiz/${track}/${date}`)}`,
      );
      return;
    }
    if (resume && savedRun) {
      setAnswers(savedRun.answers);
      attemptRef.current = savedRun.attemptId;
      setAttemptId(savedRun.attemptId);
      setStartedAt(savedRun.startedAt);
      showQuestion(savedRun.answers.length, savedRun.answers);
    } else {
      clearQuizRun(key);
      setAnswers([]);
      attemptRef.current = crypto.randomUUID();
      setAttemptId(attemptRef.current);
      setStartedAt(Date.now());
      setScored(null);
      trackEvent("quiz_started", { track, date });
      showQuestion(0, []);
    }
    setSavedRun(null);
  };

  const check = async () => {
    if (choice === null) return;
    const timeMs = performance.now() - qStart.current;
    setPhase("checking");
    buzz();
    try {
      const res = await send("/api/quiz/check", {
        date,
        track,
        questionId: q.id,
        choice,
        attemptId: attemptRef.current,
        challengeCode: challenge?.code,
      });
      if (leaveIfBlocked(res.status)) return;
      if (res.status === 409) {
        // This attempt is already finished on the server (say, in another tab).
        clearQuizRun(key);
        setError("This round has already been finished. Go back and start a new one.");
        setPhase("answering");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      const r = (await res.json()) as CheckReply & { attemptId?: string };
      const next = [...answers, { questionId: q.id, choice, correct: r.correct, timeMs }];
      setAnswers(next);
      adoptAttempt(r.attemptId, next);
      saveQuizRun(key, { attemptId: attemptRef.current, answers: next, startedAt });
      if (r.scored !== null) setScored(r.scored);
      setReply(r);
      setPhase("feedback");
    } catch {
      setError("We couldn't check that one. Check your connection and try again.");
      setPhase("answering");
    }
  };

  const goNext = () => {
    if (index + 1 < total) {
      showQuestion(index + 1, answers);
      return;
    }
    // Signed in: the server said whether this attempt counts. Otherwise the
    // first finished run of today's set on this device is the scored one.
    const isScored = signedIn ? !!scored : isToday && !getQuizResult(key)?.scored;
    const score = answers.filter((a) => a.correct).length;
    recordQuizResult(key, { score, total, timeMs: doneMs, scored: isScored, completedAt: Date.now() });
    trackEvent("quiz_finished", { track, date, scored: isScored, score });
    setScored(isScored);
    fetch("/api/quiz/finish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ attemptId: attemptRef.current, date, track }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats ?? null);
        // The time that counts is the server's.
        if (typeof d.timeMs === "number") setServerTimeMs(d.timeMs);
      })
      .catch(() => {});
    setPhase("done");
    window.scrollTo({ top: 0 });
  };

  if (phase === "intro") {
    return (
      <Intro
        trackTitle={trackTitle}
        date={date}
        isToday={isToday}
        total={total}
        resumeAt={savedRun ? savedRun.answers.length + 1 : null}
        // A scored round in progress can only be picked up, not restarted:
        // restarting would mean seeing the questions before a second try.
        practice={!isToday || (alreadyScored && !savedRun)}
        pickUp={isToday && serverScored === "started" && !savedRun}
        canRestart={!(isToday && savedRun && !alreadyScoredFinished(key))}
        needsSignIn={needsSignIn}
        draft={draft}
        challenge={challenge}
        onStart={start}
      />
    );
  }

  if (phase === "done") {
    return (
      <QuizResults
        track={track}
        trackTitle={trackTitle}
        date={date}
        isToday={isToday}
        questions={questions}
        answers={answers}
        timeMs={serverTimeMs ?? doneMs}
        scored={!!scored}
        attemptId={attemptId}
        profile={profile}
        challenge={challenge}
        stats={stats}
        onReplay={() => start(false)}
      />
    );
  }

  const revealed = phase === "feedback" && reply;
  const isSpot = q.format === "spot_issue";

  const optionClass = (i: number) => {
    const base = "flex w-full min-h-14 items-start gap-3 rounded-2xl border px-4 py-3 text-left text-[15px] leading-snug transition-colors";
    if (revealed) {
      if (i === reply.answerIndex) return `${base} border-ok bg-ok-soft font-medium`;
      if (i === choice) return `${base} border-notquite border-dashed bg-notquite-soft`;
      return `${base} border-line opacity-70`;
    }
    if (i === choice) return `${base} border-accent bg-accent-soft ring-2 ring-accent`;
    return `${base} border-line bg-surface hover:border-accent`;
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/95 px-4 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-2">
          <Link href="/quiz" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted">
            <span aria-hidden="true">←</span> Quiz
          </Link>
          <p className="text-sm font-medium tabular-nums" aria-label={`Question ${index + 1} of ${total}`}>
            {index + 1} / {total}
          </p>
          <p className="min-w-12 text-right text-sm text-muted tabular-nums" aria-label="Time">
            {formatTime(elapsed)}
          </p>
          <ObliqueMark height={16} />
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${((index + (revealed ? 1 : 0)) / total) * 100}%` }} />
        </div>
      </header>

      <main className="flex-1 px-4 pt-4 pb-40">
        <div key={q.id} className="anim-slide-in">
          <p className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {track === "both" && (
              <span className="rounded-full bg-accent px-2.5 py-1 text-bg">{q.track === "ct" ? "Corporate Tax" : "VAT"}</span>
            )}
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">{LEVEL[q.difficulty]}</span>
            <span className="rounded-full border border-line px-2.5 py-1 text-muted">{q.topicLabel}</span>
          </p>

          {q.scenario && (
            <div className={`mt-4 rounded-2xl border border-paper-line bg-paper p-4 text-[15px] leading-relaxed text-paper-ink ${isSpot ? "font-medium" : ""}`}>
              {q.scenario}
            </div>
          )}

          <h1 className="mt-4 text-lg leading-snug font-semibold text-balance">{q.prompt}</h1>
          {isSpot && !revealed && <p className="mt-1 text-sm text-muted">Tap the line with the error.</p>}

          <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Answers">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={choice === i}
                disabled={phase !== "answering"}
                onClick={() => {
                  setChoice(i);
                  buzz();
                }}
                className={optionClass(i)}
              >
                {q.format !== "true_false" && (
                  <span className="mt-px shrink-0 font-semibold text-muted" aria-hidden="true">
                    {isSpot ? `${i + 1}.` : LETTERS[i]}
                  </span>
                )}
                <span className={isSpot ? "tabular-nums" : ""}>{opt}</span>
                {revealed && i === reply.answerIndex && <span className="sr-only"> (correct answer)</span>}
                {revealed && i === choice && i !== reply.answerIndex && <span className="sr-only"> (your answer)</span>}
              </button>
            ))}
          </div>

          {revealed && (
            <div ref={feedbackRef} className="mt-5 scroll-mt-20 rounded-2xl border border-line bg-surface p-4" aria-live="polite">
              <h2 className={`text-xl font-semibold ${reply.correct ? "text-ok" : "text-notquite"}`}>
                {reply.correct ? "Spot on." : "Not quite."}
              </h2>
              {!reply.correct && (
                <p className="mt-0.5 text-sm">
                  The answer:{" "}
                  <span className="font-semibold">
                    {q.format === "true_false" ? q.options[reply.answerIndex] : `${isSpot ? `line ${reply.answerIndex + 1}` : LETTERS[reply.answerIndex]}`}
                  </span>
                </p>
              )}
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
              <ReportProblem key={q.id} itemId={q.id} kind="question" signedIn={signedIn} />
            </div>
          )}
        </div>
        <SiteFooter />
      </main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-md px-4 pt-3">
          {error && (
            <p role="alert" className="mb-2 rounded-lg bg-notquite-soft px-3 py-2 text-sm text-notquite">
              {error}
            </p>
          )}
          {revealed ? (
            <button type="button" onClick={goNext} className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold">
              {index + 1 < total ? "Next question" : "See results"}
            </button>
          ) : (
            <button
              type="button"
              onClick={check}
              disabled={choice === null || phase === "checking"}
              className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold"
            >
              {phase === "checking" ? "Checking…" : "Check answer"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function alreadyScoredFinished(key: string) {
  return !!getQuizResult(key)?.scored;
}

function Intro(props: {
  trackTitle: string;
  date: string;
  isToday: boolean;
  total: number;
  resumeAt: number | null;
  practice: boolean;
  // Today's scored round was started on another device and isn't finished.
  pickUp: boolean;
  needsSignIn: boolean;
  draft: boolean;
  canRestart: boolean;
  challenge: ChallengeInfo | null;
  onStart: (resume: boolean) => void;
}) {
  const { trackTitle, date, isToday, total, resumeAt, practice, pickUp, needsSignIn, draft, canRestart, challenge, onStart } = props;
  return (
    <>
      <header className="flex h-14 items-center justify-between px-4">
        <Link href="/quiz" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted">
          <span aria-hidden="true">←</span> Quiz
        </Link>
        <ObliqueMark height={16} />
      </header>
      <main className="flex flex-1 flex-col px-4 pt-6">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          {isToday ? "Today's quiz" : "From the archive"} · {longDate(date)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{trackTitle}</h1>
        <p className="mt-2 text-base text-muted">
          {total} questions: 5 foundation, 10 intermediate and 5 advanced. After each one you&apos;ll see the rule and why it
          applies.
        </p>

        {challenge && <ChallengeBanner challenge={challenge} />}

        {draft && (
          <p className="mt-4 rounded-xl bg-notquite-soft px-3 py-2 text-sm text-notquite">
            Preview: some questions here are drafts awaiting tax review.
          </p>
        )}

        <div className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm">
          {pickUp ? (
            <p>
              <span className="font-semibold">Your scored round is already under way.</span> You started it on another
              device. Carry on here: the answers you&apos;ve already given still stand.
            </p>
          ) : practice ? (
            <p>
              <span className="font-semibold">Practice round.</span>{" "}
              {isToday
                ? "Today's scored round on this track has been used, so this one won't change your score."
                : "Past sets are for practice. Scores count only on the day."}
            </p>
          ) : (
            <p>
              <span className="font-semibold">One scored attempt today.</span> One point per correct answer; time breaks ties.
              It starts when you tap Start. Once you&apos;ve finished, you can play again as practice.
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          {resumeAt && !needsSignIn && (
            <button type="button" onClick={() => onStart(true)} className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold">
              Pick up at question {resumeAt}
            </button>
          )}
          {(canRestart || needsSignIn || !resumeAt) && (
            <button
              type="button"
              onClick={() => onStart(false)}
              className={
                resumeAt && !needsSignIn
                  ? "min-h-12 rounded-full border border-line px-4 text-sm font-semibold"
                  : "min-h-14 rounded-full btn-primary px-4 text-base font-semibold"
              }
            >
              {needsSignIn ? "Sign in to start" : resumeAt ? "Start again (practice)" : pickUp ? "Carry on" : practice ? "Start practice" : "Start quiz"}
            </button>
          )}
          {needsSignIn && (
            <Link href="/quiz/sample" className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
              Try 5 sample questions first
            </Link>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
