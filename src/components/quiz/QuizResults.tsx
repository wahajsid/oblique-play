"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ObliqueMark } from "@/components/brand/ObliqueMark";
import { SiteFooter } from "@/components/SiteFooter";
import { DiagnosticOffer } from "@/components/offers/DiagnosticOffer";
import { TopicOffer, weakestTopic } from "@/components/offers/TopicOffer";
import { ProfileCard } from "@/components/ProfileCard";
import { MilestoneOffer } from "@/components/offers/MilestoneOffer";
import { ChallengeResult, shareMessage, type ChallengeInfo } from "@/components/share/Challenge";
import { ShareSheet } from "@/components/share/ShareSheet";
import { challengeLink } from "@/lib/share-client";
import type { PlayerProfile, PlayerStats } from "@/lib/players";
import { longDate } from "@/lib/quiz/dates";
import { localStreak, type QuizAnswer } from "@/lib/quiz/progress";
import type { PlayTrack } from "@/lib/quiz/types";
import { formatTime } from "@/lib/review/progress";
import type { GameQuestion } from "./QuizGame";

function headline(score: number, total: number) {
  if (score === total) return "A perfect round.";
  if (score >= total * 0.8) return "Sharp work.";
  if (score >= total * 0.5) return "Solid. A few to revisit.";
  return "Every round teaches something.";
}

const SHARE_NAME: Record<PlayTrack, string> = { ct: "Corporate Tax", vat: "VAT", both: "Corporate Tax and VAT" };

export function QuizResults(props: {
  track: PlayTrack;
  trackTitle: string;
  date: string;
  isToday: boolean;
  questions: GameQuestion[];
  answers: QuizAnswer[];
  timeMs: number;
  scored: boolean;
  attemptId: string;
  profile: PlayerProfile | null;
  challenge: ChallengeInfo | null;
  stats: PlayerStats | null;
  onReplay: () => void;
}) {
  const { track, trackTitle, date, isToday, questions, answers, timeMs, scored, attemptId, profile, challenge, stats, onReplay } = props;
  const total = questions.length;
  const score = answers.filter((a) => a.correct).length;
  const [streak, setStreak] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => setStreak(localStreak()), []);

  // Topic breakdown, e.g. "Free zones 4/4"
  const correctById = new Map(answers.map((a) => [a.questionId, a.correct]));
  const topics = new Map<string, { right: number; of: number }>();
  for (const q of questions) {
    const t = topics.get(q.topicLabel) ?? { right: 0, of: 0 };
    t.of++;
    if (correctById.get(q.id)) t.right++;
    topics.set(q.topicLabel, t);
  }
  const weak = weakestTopic(questions.map((q) => ({ track: q.track, topic: q.topic, label: q.topicLabel, correct: !!correctById.get(q.id) })));
  const breakdown = [...topics.entries()].sort((a, b) => b[1].of - a[1].of || a[0].localeCompare(b[0]));

  const message = shareMessage({
    score,
    total,
    what: `${isToday ? "today's" : `the ${longDate(date)}`} UAE ${SHARE_NAME[track]} quiz`,
    challenge,
  });

  // A result that can be pasted anywhere as plain text: one square per
  // question, in order, without giving any answer away.
  const shownStreak = stats?.streak ?? streak;
  const squares = questions.map((q) => (correctById.get(q.id) ? "🟩" : "⬜"));
  const rows = [squares.slice(0, 10).join(""), squares.slice(10).join("")].filter(Boolean);
  const pasteable = [
    `UAE ${SHARE_NAME[track]} quiz · ${longDate(date)}`,
    `${score}/${total} in ${formatTime(timeMs)}${shownStreak > 1 ? ` · 🔥 ${shownStreak}-day streak` : ""}`,
    ...rows,
    `${typeof window === "undefined" ? "" : window.location.host}`,
  ].join("\n");
  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(pasteable);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  return (
    <>
      <header className="flex h-14 items-center justify-between px-4">
        <Link href="/quiz" className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted">
          <span aria-hidden="true">←</span> Quiz
        </Link>
        <ObliqueMark height={16} />
      </header>
      <main className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">
          {trackTitle} · {longDate(date)}
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{headline(score, total)}</h1>
        <p className="mt-1 text-sm text-muted">{scored ? "Scored round." : "Practice round: this doesn't change your score."}</p>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          <Stat label="Score" value={`${score}/${total}`} />
          <Stat label="Time" value={formatTime(timeMs)} />
          <Stat label="Day streak" value={String(stats?.streak ?? streak)} />
        </div>

        {challenge && <ChallengeResult you={{ score, total, timeMs }} them={challenge} />}
        <MilestoneOffer stats={stats} afterShift={false} hasName={!!profile?.displayName} />
        {/* Asked once, after a player's first round. Without it most players
            are never identified, and no offer can be shown to them. */}
        {profile && !profile.displayName && !profile.role && <ProfileCard profile={profile} />}
        {profile?.role !== "student" && weak ? <TopicOffer weak={weak} /> : profile?.role === "business_owner" && <DiagnosticOffer />}

        <section className="mt-6 rounded-2xl border border-line bg-surface p-4" aria-labelledby="breakdown-title">
          <h2 id="breakdown-title" className="text-sm font-semibold">
            By topic
          </h2>
          <ul className="mt-2 divide-y divide-line text-sm">
            {breakdown.map(([label, t]) => (
              <li key={label} className="flex min-h-10 items-center justify-between gap-3">
                <span>{label}</span>
                <span className={`font-semibold tabular-nums ${t.right === t.of ? "text-ok" : ""}`}>
                  {t.right}/{t.of}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          <button type="button" onClick={() => setSharing(true)} className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold">
            {challenge ? "Send a rematch" : "Challenge someone"}
          </button>
          <button type="button" onClick={copyResult} className="min-h-12 rounded-full border border-line text-sm font-semibold" data-testid="copy-result">
            {copied ? "Copied. Paste it anywhere" : "Copy result as text"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onReplay} className="min-h-12 rounded-full border border-line text-sm font-semibold">
              Practise again
            </button>
            <Link href="/quiz" className="inline-flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
              Other tracks
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
      {sharing && (
        <ShareSheet
          create={profile ? challengeLink("quiz", attemptId) : null}
          fallbackUrl={`${typeof window === "undefined" ? "" : window.location.origin}/quiz/${track}/${date}`}
          message={message}
          subject="UAE Tax Daily Quiz by Oblique"
          hasName={!!profile?.displayName}
          onClose={() => setSharing(false)}
        />
      )}
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
