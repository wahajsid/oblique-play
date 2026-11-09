import "server-only";

import { allQuestions } from "@/content/quiz/questions";
import sampleData from "@/content/quiz/sample.json";
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
  both: { title: "Mixed: Corporate Tax and VAT", short: "Mixed", summary: "10 Corporate Tax and 10 VAT, for practice" },
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

// The order a player sees a question's options in. Each player gets their
// own order for multiple-choice questions, so "question 5 is C" can't be
// passed around. True/false and spot-the-issue keep their written order, as
// does any question whose text refers to an option by position.
const POSITIONAL = /\b(all|none|both) of (the|these) (above|below|options)|\boptions? [A-D]\b|\b(first|second|third|fourth|last|other) (option|answer)s?\b|\b[A-D] (and|or|to) [A-D]\b|\banswers? [A-D]\b/i;

function optionOrder(q: QuizQuestion, seed: string): number[] {
  const order = q.options.map((_, i) => i);
  if (!seed || (q.format !== "mcq" && q.format !== "scenario")) return order;
  if (POSITIONAL.test(`${q.options.join(" | ")} ${q.explanation.what} ${q.explanation.why}`)) return order;
  // A small seeded shuffle: the same player and question always give the same order.
  let h = 2166136261;
  for (const ch of `${seed}:${q.id}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let state = h >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// `seed` is the player's id; without one the written order is used.
export function getPublicQuestions(ids: string[], seed = ""): (PublicQuestion & { topicLabel: string })[] {
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
      options: optionOrder(q, seed).map((i) => q.options[i]),
    };
  });
}

// Five fixed sample questions anyone can try without signing in. They come
// from the PassDrill set, which is already public, so they give nothing away.
const sampleIds = (sampleData as string[]).filter((id) => questionsById.has(id));

export function getSampleQuestions() {
  return getPublicQuestions(sampleIds);
}

export function checkSampleAnswer(questionId: string, choice: number): QuizCheckResult | null {
  if (!sampleIds.includes(questionId)) return null;
  return mark(questionsById.get(questionId) as QuizQuestion, choice, "");
}

function mark(q: QuizQuestion, choice: number, seed: string): QuizCheckResult | null {
  if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return null;
  const order = optionOrder(q, seed);
  // Both the player's choice and the answer we send back are positions in
  // the order that player sees.
  return { correct: order[choice] === q.answerIndex, answerIndex: order.indexOf(q.answerIndex), explanation: q.explanation };
}

export function isQuestionId(id: string): boolean {
  return questionsById.has(id);
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
  // The player's id, to undo their option order.
  seed?: string;
}): QuizCheckResult | null {
  const day = getDailySet(input.date);
  if (!day || !getPlayIds(day, input.track).includes(input.questionId)) return null;
  return mark(questionsById.get(input.questionId) as QuizQuestion, input.choice, input.seed ?? "");
}
