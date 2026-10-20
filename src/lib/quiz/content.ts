import "server-only";

import { allQuestions } from "@/content/quiz/questions";
import scheduleData from "@/content/quiz/schedule.json";
import topicsData from "@/content/quiz/topics.json";
import { isIsoDate, uaeToday } from "./dates";
import type { DailySet, Difficulty, PlayTrack, PublicQuestion, QuizCheckResult, QuizQuestion, Track } from "./types";

// "server-only" keeps answers, explanations and future sets out of the
// browser: the build fails if a client component imports this file.

const questionsById = new Map(allQuestions.map((q) => [q.id, q]));
const schedule = scheduleData as DailySet[];
const topics = topicsData as Record<Track, Record<string, string>>;

export const TRACKS: Record<PlayTrack, { title: string; short: string; summary: string }> = {
  ct: { title: "Corporate Tax", short: "Corporate Tax", summary: "20 Corporate Tax questions" },
  vat: { title: "VAT", short: "VAT", summary: "20 VAT questions" },
  both: { title: "Corporate Tax and VAT", short: "Both", summary: "10 Corporate Tax and 10 VAT" },
};

export function isPlayTrack(s: string): s is PlayTrack {
  return s === "ct" || s === "vat" || s === "both";
}

export function topicLabel(track: Track, topic: string): string {
  return topics[track]?.[topic] ?? topic;
}

// A day's set, but never one from the future: tomorrow's questions stay
// private until midnight UAE time.
export function getDailySet(date: string): DailySet | null {
  if (!isIsoDate(date) || date > uaeToday()) return null;
  return schedule.find((d) => d.date === date) ?? null;
}

export function getPastDates(): string[] {
  const today = uaeToday();
  return schedule.map((d) => d.date).filter((d) => d <= today).reverse();
}

// "Both" takes 10 of the day's 20 from each track so the mix stays
// 5 foundation / 10 intermediate / 5 advanced overall:
// Corporate Tax gives 3 / 5 / 2 and VAT gives 2 / 5 / 3.
const BOTH_SHARE: Record<Track, Record<Difficulty, number>> = {
  ct: { foundation: 3, intermediate: 5, advanced: 2 },
  vat: { foundation: 2, intermediate: 5, advanced: 3 },
};
const ORDER: Difficulty[] = ["foundation", "intermediate", "advanced"];

export function getPlayIds(day: DailySet, track: PlayTrack): string[] {
  if (track !== "both") return day[track];
  const take = (t: Track, d: Difficulty) =>
    day[t].filter((id) => questionsById.get(id)?.difficulty === d).slice(0, BOTH_SHARE[t][d]);
  // Easier first, alternating Corporate Tax and VAT within each level.
  return ORDER.flatMap((d) => interleave(take("ct", d), take("vat", d)));
}

function interleave(a: string[], b: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

export function getPublicQuestions(ids: string[]): (PublicQuestion & { topicLabel: string })[] {
  return ids.map((id) => {
    const q = questionsById.get(id)!;
    return {
      id: q.id,
      track: q.track,
      format: q.format,
      difficulty: q.difficulty,
      topic: q.topic,
      topicLabel: topicLabel(q.track, q.topic),
      scenario: q.scenario,
      prompt: q.prompt,
      options: q.options,
    };
  });
}

export function hasDrafts(ids: string[]): boolean {
  return ids.some((id) => questionsById.get(id)?.meta.status !== "approved");
}

// Marks an answer. The question must belong to that day's set for that track.
export function checkQuizAnswer(input: {
  date: string;
  track: PlayTrack;
  questionId: string;
  choice: number;
}): QuizCheckResult | null {
  const day = getDailySet(input.date);
  if (!day || !getPlayIds(day, input.track).includes(input.questionId)) return null;
  const q = questionsById.get(input.questionId) as QuizQuestion;
  if (!Number.isInteger(input.choice) || input.choice < 0 || input.choice >= q.options.length) return null;
  return { correct: input.choice === q.answerIndex, answerIndex: q.answerIndex, explanation: q.explanation };
}
