// Writes the review workbooks for the tax team.
//
// Run with: npm run review:export
//
//   review/oblique-play-review-ct.xlsx   Corporate Tax quiz questions
//   review/oblique-play-review-vat.xlsx  VAT quiz questions and every document
//
// Reviewers edit the yellow cells and pick a decision for each row
// (Approve / Needs changes / Reject), then send the file back.
// `npm run review:import -- <file>` applies their work.

import ExcelJS from "exceljs";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const quizDir = join(root, "src/content/quiz/questions");
const reviewDir = join(root, "src/content/review");
const outDir = join(root, "review");
mkdirSync(outDir, { recursive: true });

const topics = JSON.parse(readFileSync(join(root, "src/content/quiz/topics.json"), "utf8"));
const questions = readdirSync(quizDir)
  .filter((f) => f.endsWith(".json"))
  .flatMap((f) => JSON.parse(readFileSync(join(quizDir, f), "utf8")));
const documents = readdirSync(reviewDir)
  .filter((f) => /^(shift-\d+|daily)\.json$/.test(f))
  .sort()
  .flatMap((f) => JSON.parse(readFileSync(join(reviewDir, f), "utf8")));

export const DECISIONS = ["Approve", "Needs changes", "Reject"];
const LETTERS = ["A", "B", "C", "D"];
const NAVY = "FF141428";
const EDITABLE = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF6CC" } };
const HELD = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBEEDC" } };

function instructions(wb, who) {
  const ws = wb.addWorksheet("How to review");
  ws.columns = [{ width: 110 }];
  [
    ["Oblique Play: content review", true],
    [`For: ${who}`, false],
    ["", false],
    ["1. Each row is one question or document. Read it as a player would, then check the answer, the What / Why explanation and the reference.", false],
    ["2. Yellow cells are yours to edit. Fix wording, the correct answer, the explanation or the reference directly in the cell.", false],
    ["3. Pick a DECISION for every row: Approve (ready to go live), Needs changes (say what in Comments), or Reject (should not be used).", false],
    ["4. Put your name in Reviewer for every row you decide. An approval without a name is ignored.", false],
    ["5. Rows shaded orange are ON HOLD: an AI verifier disagreed or found a problem. The Hold column says why. Approving a held row clears the hold, so please fix the issue first.", false],
    ["6. 'Notes for reviewer' lists points the writers and the blind verifiers were least sure of. Please check those first.", false],
    ["7. Send the file back as it is. Don't add, delete or reorder rows, and don't change the ID column.", false],
    ["", false],
    ["Every item was drafted by AI and then answered blind by a separate AI verifier that didn't see the intended answer. Nothing goes live until a named reviewer approves it.", false],
  ].forEach(([text, bold]) => {
    const row = ws.addRow([text]);
    row.font = { bold, size: bold ? 14 : 11, color: bold ? { argb: NAVY } : undefined };
    row.alignment = { wrapText: true };
  });
}

function sheet(wb, name, columns) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  head.alignment = { wrapText: true, vertical: "middle" };
  head.height = 32;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

function finishRow(ws, row, columns, held) {
  row.alignment = { wrapText: true, vertical: "top" };
  columns.forEach((c, i) => {
    const cell = row.getCell(i + 1);
    if (c.edit) cell.fill = EDITABLE;
    else if (held) cell.fill = HELD;
    if (c.key === "decision") {
      cell.dataValidation = { type: "list", allowBlank: true, formulae: [`"${DECISIONS.join(",")}"`] };
    }
  });
}

const quizColumns = [
  { header: "ID", key: "id", width: 13 },
  { header: "Status", key: "status", width: 10 },
  { header: "Hold (not used until fixed)", key: "hold", width: 30 },
  { header: "Difficulty", key: "difficulty", width: 12 },
  { header: "Format", key: "format", width: 12 },
  { header: "Topic", key: "topic", width: 18 },
  { header: "Scenario / extract heading", key: "scenario", width: 40, edit: true },
  { header: "Question", key: "prompt", width: 40, edit: true },
  { header: "Option A", key: "a", width: 28, edit: true },
  { header: "Option B", key: "b", width: 28, edit: true },
  { header: "Option C", key: "c", width: 28, edit: true },
  { header: "Option D", key: "d", width: 28, edit: true },
  { header: "Correct answer (A-D, or True/False)", key: "answer", width: 12, edit: true },
  { header: "What (the rule)", key: "what", width: 40, edit: true },
  { header: "Why (applied)", key: "why", width: 50, edit: true },
  { header: "Reference", key: "reference", width: 30, edit: true },
  { header: "Applies from", key: "appliesFrom", width: 12, edit: true },
  { header: "Applies until", key: "appliesUntil", width: 12, edit: true },
  { header: "Notes for reviewer", key: "notes", width: 60 },
  { header: "DECISION", key: "decision", width: 14, edit: true },
  { header: "Reviewer", key: "reviewer", width: 14, edit: true },
  { header: "Comments", key: "comments", width: 40, edit: true },
];

function addQuestions(ws, track) {
  for (const q of questions.filter((x) => x.track === track).sort((a, b) => a.id.localeCompare(b.id))) {
    const tf = q.format === "true_false";
    const row = ws.addRow({
      id: q.id,
      status: q.meta.status,
      hold: q.meta.hold ?? "",
      difficulty: q.difficulty,
      format: q.format,
      topic: topics[track][q.topic] ?? q.topic,
      scenario: q.scenario ?? "",
      prompt: q.prompt,
      a: tf ? "True" : q.options[0],
      b: tf ? "False" : q.options[1],
      c: tf ? "" : q.options[2],
      d: tf ? "" : q.options[3],
      answer: tf ? q.options[q.answerIndex] : LETTERS[q.answerIndex],
      what: q.explanation.what,
      why: q.explanation.why,
      reference: q.explanation.reference,
      appliesFrom: q.meta.appliesFrom,
      appliesUntil: q.meta.appliesUntil ?? "",
      notes: q.meta.reviewNotes ?? "",
      decision: q.meta.status === "approved" ? "Approve" : "",
      reviewer: q.meta.reviewer ?? "",
      comments: "",
    });
    finishRow(ws, row, quizColumns, !!q.meta.hold);
  }
}

// A document as plain text, the way a reviewer reads it on screen.
function documentText(d) {
  const lines = [d.heading.value];
  for (const b of d.blocks.filter((x) => x.variant !== "totals" && x.variant !== "notes")) {
    lines.push("", b.title.toUpperCase(), ...b.fields.map((f) => `  ${f.label}: ${f.value}`));
  }
  lines.push("", `ITEMS (${d.lines.currency})`);
  for (const r of d.lines.rows) lines.push(`  ${r.description}: ${r.quantity} x ${r.unitPrice}, VAT ${r.vatRate}, ${r.amount}`);
  for (const b of d.blocks.filter((x) => x.variant === "totals" || x.variant === "notes")) {
    lines.push("", b.title.toUpperCase(), ...b.fields.map((f) => `  ${f.label}: ${f.value}`));
  }
  return lines.join("\n");
}

const docColumns = [
  { header: "ID", key: "id", width: 9 },
  { header: "Status", key: "status", width: 10 },
  { header: "Where it appears", key: "where", width: 16 },
  { header: "Document", key: "doc", width: 60 },
  { header: "Answer", key: "answer", width: 24 },
  { header: "What (the rule)", key: "what", width: 40, edit: true },
  { header: "Why (applied)", key: "why", width: 50, edit: true },
  { header: "Reference", key: "reference", width: 30, edit: true },
  { header: "Notes for reviewer", key: "notes", width: 40 },
  { header: "DECISION", key: "decision", width: 14, edit: true },
  { header: "Reviewer", key: "reviewer", width: 14, edit: true },
  { header: "Comments (describe any change to the document itself here)", key: "comments", width: 40, edit: true },
];

function addDocuments(ws) {
  for (const d of documents) {
    const row = ws.addRow({
      id: d.id,
      status: d.meta.status,
      where: d.shift === 0 ? `Daily pool, day ${Number(d.id.slice(2))}` : `Shift ${d.shift}`,
      doc: documentText(d),
      answer: d.answer.verdict === "right" ? "Looks right" : `Something's off: ${d.answer.targetLabel}`,
      what: d.explanation.what,
      why: d.explanation.why,
      reference: d.explanation.reference,
      notes: d.meta.reviewNotes ?? "",
      decision: d.meta.status === "approved" ? "Approve" : "",
      reviewer: d.meta.reviewer ?? "",
      comments: "",
    });
    finishRow(ws, row, docColumns, false);
  }
}

const ct = new ExcelJS.Workbook();
instructions(ct, "Corporate Tax reviewers (Ashta, Pranay)");
addQuestions(sheet(ct, "Quiz - Corporate Tax", quizColumns), "ct");
await ct.xlsx.writeFile(join(outDir, "oblique-play-review-ct.xlsx"));

const vat = new ExcelJS.Workbook();
instructions(vat, "VAT reviewers (Aidarous, Arslan)");
addQuestions(sheet(vat, "Quiz - VAT", quizColumns), "vat");
addDocuments(sheet(vat, "Documents", docColumns));
await vat.xlsx.writeFile(join(outDir, "oblique-play-review-vat.xlsx"));

const count = (t) => questions.filter((q) => q.track === t).length;
console.log(`review/oblique-play-review-ct.xlsx: ${count("ct")} questions`);
console.log(`review/oblique-play-review-vat.xlsx: ${count("vat")} questions, ${documents.length} documents`);
