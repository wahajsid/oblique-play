// Checks every Module 2 (daily quiz) question, and the daily schedule.
//
// Run with: npm run check:quiz
//
// Errors (the check fails):
//   - shape: id, track, format, difficulty, topic, options, answer, explanation, meta
//   - format rules: four options (true/false: exactly "True", "False"),
//     spot-the-issue: four lines, at least one unique
//   - duplicate ids, duplicate or near-duplicate questions, duplicate options
//   - naming the real regulator (the game's world says "the tax authority")
//   - schedule: unknown ids, wrong difficulty mix, a repeat within 14 days
// Warnings (shown, but don't fail):
//   - answer positions bunched on one option
//   - fewer than 14 days scheduled ahead of today

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quizDir = join(root, "src/content/quiz");
const TRACKS = ["ct", "vat"];
const DIFFICULTIES = ["foundation", "intermediate", "advanced"];
const FORMATS = ["mcq", "true_false", "scenario", "spot_issue"];
export const DAILY_MIX = { foundation: 5, intermediate: 10, advanced: 5 };
export const NO_REPEAT_DAYS = 14;

const topics = JSON.parse(readFileSync(join(quizDir, "topics.json"), "utf8"));
const files = readdirSync(join(quizDir, "questions")).filter((f) => f.endsWith(".json")).sort();

let errors = 0;
let warnings = 0;
const fail = (where, msg) => { errors++; console.log(`  x ${where}: ${msg}`); };
const warn = (where, msg) => { warnings++; console.log(`  ?  ${where}: ${msg}`); };

const byId = new Map();
const normalised = new Map();
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

for (const file of files) {
  const questions = JSON.parse(readFileSync(join(quizDir, "questions", file), "utf8"));
  console.log(`\n${file}: ${questions.length} questions`);
  for (const q of questions) {
    const at = q.id ?? "(no id)";
    if (!/^(ct|vat)-[a-z0-9]+-\d{3}$/.test(q.id ?? "")) fail(at, "id must look like ct-b1-001 or vat-pd-009");
    if (byId.has(q.id)) fail(at, `duplicate id (also in ${byId.get(q.id).file})`);
    byId.set(q.id, { ...q, file });

    if (!TRACKS.includes(q.track)) fail(at, `track "${q.track}"`);
    else if (!q.id?.startsWith(`${q.track}-`)) fail(at, "id prefix doesn't match track");
    if (!FORMATS.includes(q.format)) fail(at, `format "${q.format}"`);
    if (!DIFFICULTIES.includes(q.difficulty)) fail(at, `difficulty "${q.difficulty}"`);
    if (!topics[q.track]?.[q.topic]) fail(at, `topic "${q.topic}" is not in topics.json for ${q.track}`);
    if (!q.prompt?.trim()) fail(at, "missing prompt");
    if ((q.format === "scenario" || q.format === "spot_issue") && !q.scenario?.trim()) fail(at, `${q.format} needs scenario text`);

    const opts = Array.isArray(q.options) ? q.options : [];
    if (q.format === "true_false") {
      if (opts.length !== 2 || opts[0] !== "True" || opts[1] !== "False") fail(at, 'true/false options must be exactly ["True", "False"]');
    } else if (opts.length !== 4) {
      fail(at, `needs 4 options, has ${opts.length}`);
    }
    if (new Set(opts.map(norm)).size !== opts.length) fail(at, "two options are the same");
    if (opts.some((o) => typeof o !== "string" || !o.trim())) fail(at, "empty option");
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= opts.length) fail(at, `answerIndex ${q.answerIndex}`);

    for (const k of ["what", "why", "reference"]) if (!q.explanation?.[k]?.trim()) fail(at, `missing explanation.${k}`);
    const words = (s) => (s ?? "").split(/\s+/).filter(Boolean).length;
    if (words(q.explanation?.what) > 45) fail(at, `"what" should be one or two sentences (${words(q.explanation.what)} words)`);

    const allText = [q.scenario, q.prompt, ...opts, q.explanation?.what, q.explanation?.why].join(" ");
    if (/federal tax authority|\bFTA\b/i.test(allText)) fail(at, 'names the real regulator; say "the tax authority"');

    const m = q.meta ?? {};
    if (!isDate(m.appliesFrom)) fail(at, "meta.appliesFrom must be YYYY-MM-DD");
    if (m.appliesUntil !== undefined && !isDate(m.appliesUntil)) fail(at, "meta.appliesUntil must be YYYY-MM-DD");
    if (!["draft", "approved"].includes(m.status)) fail(at, `meta.status "${m.status}"`);
    if (m.status === "approved" && (!m.reviewer || !isDate(m.reviewedOn))) fail(at, "approved items need a reviewer and reviewedOn date");
    if (m.status === "approved" && m.hold) fail(at, "an item on hold can't be approved; fix it and remove the hold first");
    if (!m.source?.trim()) fail(at, "missing meta.source");

    const key = norm(`${q.scenario ?? ""} ${q.prompt}`);
    if (normalised.has(key)) fail(at, `same question as ${normalised.get(key)}`);
    normalised.set(key, q.id);
  }
}

// Every question file must be listed in questions/index.ts, or the app won't load it.
const indexPath = join(quizDir, "questions", "index.ts");
const indexSrc = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
for (const file of files) {
  if (!indexSrc.includes(`"./${file}"`)) fail(file, "not imported in src/content/quiz/questions/index.ts");
}

// Answer positions: a bank where the answer is nearly always "B" is guessable.
for (const track of TRACKS) {
  const four = [...byId.values()].filter((q) => q.track === track && q.options?.length === 4);
  if (four.length < 8) continue;
  const counts = [0, 0, 0, 0];
  four.forEach((q) => counts[q.answerIndex]++);
  const share = Math.max(...counts) / four.length;
  console.log(`\n${track}: answer positions A-D = ${counts.join(" / ")}`);
  if (share > 0.4) warn(track, `${Math.round(share * 100)}% of answers are in one position`);
}

// Bank totals against the daily mix
for (const track of TRACKS) {
  const qs = [...byId.values()].filter((q) => q.track === track);
  // Held items can't be scheduled, so they don't count towards days of sets.
  const usable = qs.filter((q) => !q.meta?.hold);
  const by = Object.fromEntries(DIFFICULTIES.map((d) => [d, usable.filter((q) => q.difficulty === d).length]));
  const approved = qs.filter((q) => q.meta?.status === "approved").length;
  const held = qs.filter((q) => q.meta?.hold);
  if (held.length) console.log(`${track}: ${held.length} on hold: ${held.map((q) => q.id).join(", ")}`);
  const days = Math.min(...DIFFICULTIES.map((d) => Math.floor(by[d] / DAILY_MIX[d])));
  console.log(
    `${track}: ${qs.length} questions, ${usable.length} usable (${by.foundation} foundation / ${by.intermediate} intermediate / ${by.advanced} advanced), ` +
      `${approved} approved, enough for ${days} day(s) of unique sets`,
  );
}

// Schedule
const schedulePath = join(quizDir, "schedule.json");
if (existsSync(schedulePath)) {
  const schedule = JSON.parse(readFileSync(schedulePath, "utf8"));
  console.log(`\nschedule.json: ${schedule.length} days`);
  const lastUsed = new Map();
  let prev = null;
  for (const day of schedule) {
    if (!isDate(day.date)) fail(day.date, "bad date");
    if (prev && day.date <= prev) fail(day.date, "dates must be in order with no duplicates");
    prev = day.date;
    const dayNum = Date.parse(day.date) / 86_400_000;
    for (const track of TRACKS) {
      const ids = day[track] ?? [];
      const mix = { foundation: 0, intermediate: 0, advanced: 0 };
      for (const id of ids) {
        const q = byId.get(id);
        if (!q) { fail(`${day.date} ${track}`, `unknown question ${id}`); continue; }
        if (q.track !== track) fail(`${day.date} ${track}`, `${id} is a ${q.track} question`);
        mix[q.difficulty]++;
        if (lastUsed.has(id) && dayNum - lastUsed.get(id) < NO_REPEAT_DAYS) {
          fail(`${day.date} ${track}`, `${id} repeats ${dayNum - lastUsed.get(id)} days after it was last used`);
        }
        if (q.meta.appliesFrom > day.date || (q.meta.appliesUntil && q.meta.appliesUntil < day.date)) {
          fail(`${day.date} ${track}`, `${id} doesn't apply on this date`);
        }
        if (q.meta.hold) fail(`${day.date} ${track}`, `${id} is on hold: ${q.meta.hold}`);
        lastUsed.set(id, dayNum);
      }
      if (new Set(ids).size !== ids.length) fail(`${day.date} ${track}`, "a question appears twice");
      if (DIFFICULTIES.some((d) => mix[d] !== DAILY_MIX[d])) {
        fail(`${day.date} ${track}`, `mix is ${mix.foundation}/${mix.intermediate}/${mix.advanced}, needs 5/10/5`);
      }
    }
  }
  const todayUae = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
  const ahead = schedule.filter((d) => d.date >= todayUae).length;
  if (ahead < NO_REPEAT_DAYS) warn("schedule", `only ${ahead} day(s) scheduled from today (${todayUae}); aim for ${NO_REPEAT_DAYS}`);
}

console.log(`\n${byId.size} questions, ${errors} errors, ${warnings} warnings`);
process.exit(errors ? 1 : 0);
