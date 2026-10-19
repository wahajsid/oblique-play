// Saves shift progress in the browser after every answer, so a dropped
// connection or a closed tab loses nothing. When sign-in arrives this moves
// to Supabase; for now it lives on the device only.

export type AnswerRecord = {
  docId: string;
  correct: boolean;
  deskMs: number;
};

export type ShiftRun = {
  shift: number;
  answers: AnswerRecord[];
  startedAt: number;
};

export type ShiftBest = {
  score: number;
  total: number;
  deskMs: number;
  completedAt: number;
};

type Saved = {
  version: 1;
  runs: Record<string, ShiftRun>;
  best: Record<string, ShiftBest>;
};

const KEY = "oblique-play:review";
const empty = (): Saved => ({ version: 1, runs: {}, best: {} });

// Storage can be missing or blocked (private mode, in-app browsers),
// so every read and write is wrapped and the game still works without it.
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
    // Not saved; the shift carries on in memory.
  }
}

export function getRun(shift: number): ShiftRun | null {
  return load().runs[shift] ?? null;
}

export function saveRun(run: ShiftRun) {
  const data = load();
  data.runs[run.shift] = run;
  save(data);
}

export function clearRun(shift: number) {
  const data = load();
  delete data.runs[shift];
  save(data);
}

export function getBest(shift: number): ShiftBest | null {
  return load().best[shift] ?? null;
}

export function getAllBest(): Record<string, ShiftBest> {
  return load().best;
}

// Higher score wins; on a tie, the faster time wins.
export function recordFinish(shift: number, result: ShiftBest): boolean {
  const data = load();
  const prev = data.best[shift];
  const isBest =
    !prev || result.score > prev.score || (result.score === prev.score && result.deskMs < prev.deskMs);
  if (isBest) data.best[shift] = result;
  delete data.runs[shift];
  save(data);
  return isBest;
}

export function formatTime(ms: number): string {
  const total = Math.round(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
