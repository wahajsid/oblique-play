// Picks the daily quiz sets ahead of time and saves them to
// src/content/quiz/schedule.json.
//
// Run with: npm run quiz:schedule -- --days 14 [--from 2026-11-03] [--drafts]
//
// Days already in the schedule are never changed, so past sets (and any
// challenge links to them) stay the same. New days are added after the last
// scheduled day. For each day and track it picks:
//   - 5 foundation, 10 intermediate and 5 advanced questions
//   - none used in the previous 14 days
//   - least recently used first (never-used before used), so the whole
//     bank gets played before anything comes round again
//   - no more than 3 questions on one topic, and no more than half of the
//     day in one format (multiple choice, true/false and so on), where the
//     bank allows
//   - only questions whose rule applies on that day
// Only approved questions are used, unless --drafts is given (for previews).
// Ties are broken by a fixed hash of the date and question id, so running it
// twice gives the same result.

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quizDir = join(root, "src/content/quiz");
const schedulePath = join(quizDir, "schedule.json");
const MIX = { foundation: 5, intermediate: 10, advanced: 5 };
const NO_REPEAT_DAYS = 14;
const MAX_PER_TOPIC = 3;
const MAX_PER_FORMAT = 10;
const TRACKS = ["ct", "vat"];

const args = process.argv.slice(2);
const arg = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const days = Number(arg("days") ?? 14);
const useDrafts = args.includes("--drafts");

const questions = readdirSync(join(quizDir, "questions"))
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(join(quizDir, "questions", f), "utf8")))
  .filter((q) => useDrafts || q.meta.status === "approved");

const schedule = existsSync(schedulePath) ? JSON.parse(readFileSync(schedulePath, "utf8")) : [];

// FNV-1a: a small, fixed hash for repeatable tie-breaks.
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};
const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;
const addDays = (date, n) => new Date((dayNumber(date) + n) * 86_400_000).toISOString().slice(0, 10);
const todayUae = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);

const lastUsed = new Map();
for (const day of schedule) for (const t of TRACKS) for (const id of day[t]) lastUsed.set(id, dayNumber(day.date));

function pickTrack(track, date) {
  const today = dayNumber(date);
  const eligible = questions.filter(
    (q) =>
      q.track === track &&
      q.meta.appliesFrom <= date &&
      (!q.meta.appliesUntil || q.meta.appliesUntil >= date) &&
      (!lastUsed.has(q.id) || today - lastUsed.get(q.id) >= NO_REPEAT_DAYS),
  );
  const picked = [];
  const perTopic = new Map();
  const perFormat = new Map();
  for (const difficulty of Object.keys(MIX)) {
    const pool = eligible
      .filter((q) => q.difficulty === difficulty)
      .sort((a, b) => (lastUsed.get(a.id) ?? -1) - (lastUsed.get(b.id) ?? -1) || hash(date + a.id) - hash(date + b.id));
    const chosen = [];
    // First pass respects the topic and format caps; second pass fills any gap.
    for (const capped of [true, false]) {
      for (const q of pool) {
        if (chosen.length === MIX[difficulty]) break;
        if (chosen.includes(q)) continue;
        if (capped && (perTopic.get(q.topic) ?? 0) >= MAX_PER_TOPIC) continue;
        if (capped && (perFormat.get(q.format) ?? 0) >= MAX_PER_FORMAT) continue;
        chosen.push(q);
        perTopic.set(q.topic, (perTopic.get(q.topic) ?? 0) + 1);
        perFormat.set(q.format, (perFormat.get(q.format) ?? 0) + 1);
      }
    }
    if (chosen.length < MIX[difficulty]) {
      return { error: `${track}: only ${chosen.length} ${difficulty} questions available, needs ${MIX[difficulty]}` };
    }
    // Within a difficulty, a fixed shuffle so topics don't arrive in bank order.
    chosen.sort((a, b) => hash(`${date}:order:${a.id}`) - hash(`${date}:order:${b.id}`));
    picked.push(...chosen);
  }
  return { ids: picked.map((q) => q.id) };
}

const last = schedule.at(-1)?.date;
let date = last ? addDays(last, 1) : (arg("from") ?? todayUae);
const added = [];
for (let n = 0; n < days; n++, date = addDays(date, 1)) {
  const day = { date };
  let stop = null;
  for (const track of TRACKS) {
    const result = pickTrack(track, date);
    if (result.error) {
      stop = result.error;
      break;
    }
    day[track] = result.ids;
  }
  if (stop) {
    console.log(`Stopped at ${date}: ${stop}.`);
    break;
  }
  for (const t of TRACKS) for (const id of day[t]) lastUsed.set(id, dayNumber(date));
  schedule.push(day);
  added.push(date);
}

writeFileSync(schedulePath, `${JSON.stringify(schedule, null, 2)}\n`);
console.log(
  added.length
    ? `Added ${added.length} day(s): ${added[0]} to ${added.at(-1)}${useDrafts ? " (INCLUDING DRAFTS: preview only)" : ""}.`
    : "No days added.",
);
console.log(`Schedule now covers ${schedule[0]?.date ?? "-"} to ${schedule.at(-1)?.date ?? "-"}.`);
