// Applies a reviewer's workbook back to the content files.
//
// Run with: npm run review:import -- review/oblique-play-review-vat.xlsx
//
// For each row, by ID:
//   - edited yellow cells replace the content (question text, options, the
//     correct answer, explanation, reference, dates)
//   - Approve + a reviewer name: approved, with the reviewer and today's date.
//     A hold is cleared (and noted), because the reviewer has the final word.
//   - Needs changes / Reject: put on hold with the reviewer's comment, and
//     back to draft.
//   - No decision: only edits are applied.
// Afterwards run `npm run check:quiz` and `npm run check:content`.

import ExcelJS from "exceljs";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quizDir = join(root, "src/content/quiz/questions");
const reviewDir = join(root, "src/content/review");
const file = process.argv[2];
if (!file) {
  console.error("Usage: npm run review:import -- <workbook.xlsx>");
  process.exit(1);
}
const today = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
const LETTERS = ["A", "B", "C", "D"];

// Load every content file, remembering which file each item came from.
const files = new Map();
const items = new Map();
for (const [dir, pattern] of [
  [quizDir, /\.json$/],
  [reviewDir, /^(shift-\d+|daily)\.json$/],
]) {
  for (const f of readdirSync(dir).filter((x) => pattern.test(x))) {
    const path = join(dir, f);
    const list = JSON.parse(readFileSync(path, "utf8"));
    files.set(path, list);
    list.forEach((item) => items.set(item.id, { item, path }));
  }
}

const text = (v) => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v) return v.richText.map((r) => r.text).join("");
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v);
};
const note = (meta, line) => (meta.reviewNotes = `${meta.reviewNotes ? `${meta.reviewNotes} | ` : ""}${line}`);

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(file);
const touched = new Set();
const tally = { approved: 0, changes: 0, rejected: 0, edited: 0, skipped: 0 };
const problems = [];

for (const ws of wb.worksheets.filter((w) => w.name !== "How to review")) {
  const headers = ws.getRow(1).values.map((h) => text(h));
  const col = (name) => headers.findIndex((h) => h.startsWith(name));
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const get = (name) => (col(name) > 0 ? text(row.getCell(col(name)).value).trim() : undefined);
    const id = get("ID");
    const found = items.get(id);
    if (!found) {
      problems.push(`${ws.name} row ${n}: unknown ID "${id}"`);
      return;
    }
    const { item, path } = found;
    const isQuiz = "answerIndex" in item;
    let edited = false;
    const set = (obj, key, value) => {
      if (value !== undefined && value !== (obj[key] ?? "")) {
        obj[key] = value;
        edited = true;
      }
    };

    // Edits
    set(item.explanation, "what", get("What"));
    set(item.explanation, "why", get("Why"));
    set(item.explanation, "reference", get("Reference"));
    if (isQuiz) {
      const scenario = get("Scenario");
      if (scenario !== undefined && scenario !== (item.scenario ?? "")) {
        if (scenario) item.scenario = scenario;
        else delete item.scenario;
        edited = true;
      }
      set(item, "prompt", get("Question"));
      if (item.format !== "true_false") {
        const opts = ["Option A", "Option B", "Option C", "Option D"].map(get);
        if (opts.every((o) => o !== undefined) && opts.some((o, i) => o !== item.options[i])) {
          item.options = opts;
          edited = true;
        }
      }
      const ans = get("Correct answer");
      if (ans) {
        const idx = item.format === "true_false" ? ["true", "false"].indexOf(ans.toLowerCase()) : LETTERS.indexOf(ans.toUpperCase());
        if (idx < 0) problems.push(`${id}: correct answer "${ans}" not understood; left as it was`);
        else if (idx !== item.answerIndex) {
          item.answerIndex = idx;
          edited = true;
        }
      }
      set(item.meta, "appliesFrom", get("Applies from"));
      const until = get("Applies until");
      if (until !== undefined && until !== (item.meta.appliesUntil ?? "")) {
        if (until) item.meta.appliesUntil = until;
        else delete item.meta.appliesUntil;
        edited = true;
      }
    }

    // Decision
    const decision = get("DECISION");
    const reviewer = get("Reviewer");
    const comments = get("Comments") ?? "";
    if (decision === "Approve") {
      if (!reviewer) {
        problems.push(`${id}: approved without a reviewer name; not approved`);
      } else {
        if (item.meta.hold) note(item.meta, `Hold cleared by ${reviewer} on ${today} (was: ${item.meta.hold})`);
        delete item.meta.hold;
        item.meta.status = "approved";
        item.meta.reviewer = reviewer;
        item.meta.reviewedOn = today;
        if (comments) note(item.meta, `${reviewer}: ${comments}`);
        tally.approved++;
      }
    } else if (decision === "Needs changes" || decision === "Reject") {
      const who = reviewer || "Reviewer";
      item.meta.status = "draft";
      item.meta.reviewer = null;
      item.meta.reviewedOn = null;
      item.meta.hold = `${decision === "Reject" ? "Rejected" : "Needs changes"} (${who}, ${today}): ${comments || "no comment given"}`;
      decision === "Reject" ? tally.rejected++ : tally.changes++;
    } else if (decision) {
      problems.push(`${id}: decision "${decision}" not understood`);
    } else if (!edited) {
      tally.skipped++;
    }
    // An edit to an approved item needs approving again.
    if (edited && decision !== "Approve" && item.meta.status === "approved") {
      item.meta.status = "draft";
      note(item.meta, `Edited on ${today} after approval; needs approving again.`);
    }
    if (edited) tally.edited++;
    if (edited || decision) touched.add(path);
  });
}

for (const path of touched) writeFileSync(path, `${JSON.stringify(files.get(path), null, 2)}\n`);
console.log(
  `${file}: ${tally.approved} approved, ${tally.changes} need changes, ${tally.rejected} rejected, ${tally.edited} edited, ${tally.skipped} untouched`,
);
problems.forEach((p) => console.log(`  ! ${p}`));
console.log("Now run: npm run check:quiz && npm run check:content");
