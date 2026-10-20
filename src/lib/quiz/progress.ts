// Saves quiz progress in the browser after every answer, and remembers
// results so the track picker and archive can show what's been played.
// Signed-in players' scores are also recorded on the server; this copy is
// for the screens on this device.

import { addDays, uaeToday } from "./dates";

export type QuizAnswer = { questionId: string; choice: number; correct: boolean; timeMs: number };

export type QuizRun = {
  attemptId: string;
  answers: QuizAnswer[];
  startedAt: number;
};

export type QuizResult = {
  score: number;
  total: number;
  timeMs: number;
  scored: boolean;
  completedAt: number;
};

type Saved = {
  version: 1;
  runs: Record<string, QuizRun>;
  results: Record<string, QuizResult>;
};

const KEY = "oblique-play:quiz";
const empty = (): Saved => ({ version: 1, runs: {}, results: {} });
export const runKey = (track: string, date: string) => `${track}:${date}`;

function load(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Saved) : null;
    return parsed?.version === 1 ? parsed : empty();
  } catch {
    return empty();
  }
}

function save(data: Saved) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Not saved; the quiz carries on in memory.
  }
}

export function getQuizRun(key: string): QuizRun | null {
  return load().runs[key] ?? null;
}

export function saveQuizRun(key: string, run: QuizRun) {
  const data = load();
  data.runs[key] = run;
  save(data);
}

export function clearQuizRun(key: string) {
  const data = load();
  delete data.runs[key];
  save(data);
}

export function getQuizResult(key: string): QuizResult | null {
  return load().results[key] ?? null;
}

export function getAllQuizResults(): Record<string, QuizResult> {
  return load().results;
}

// Keeps the scored result for a day. A practice run only fills the slot
// when there's nothing there yet, and never replaces a scored one.
export function recordQuizResult(key: string, result: QuizResult) {
  const data = load();
  const prev = data.results[key];
  if (!prev || (result.scored && !prev.scored)) data.results[key] = result;
  delete data.runs[key];
  save(data);
}

// Days in a row, ending today, with at least one scored quiz on this device.
export function localStreak(today = uaeToday()): number {
  const days = new Set(
    Object.entries(load().results)
      .filter(([, r]) => r.scored)
      .map(([key]) => key.split(":")[1]),
  );
  let streak = 0;
  for (let d = today; days.has(d); d = addDays(d, -1)) streak++;
  return streak;
}
