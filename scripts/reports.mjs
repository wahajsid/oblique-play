// Reports from "Report a problem with this answer".
//
//   npm run reports                     open reports, grouped by question or document
//   npm run reports -- all              include closed ones
//   npm run reports -- close <report id or item id> <fixed|no_change|duplicate> "what was done" --by "Name"
//
// Closing by item id closes every open report on that item.
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, from the
// environment or .env.local. See docs/REPORTS.md.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or put them in .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Every question and document, to show what each report is about.
const items = new Map();
const quizDir = join(root, "src/content/quiz/questions");
for (const f of readdirSync(quizDir).filter((x) => x.endsWith(".json"))) {
  for (const q of JSON.parse(readFileSync(join(quizDir, f), "utf8"))) items.set(q.id, { file: `quiz/questions/${f}`, q });
}
const reviewDir = join(root, "src/content/review");
for (const f of readdirSync(reviewDir).filter((x) => /^(shift-\d+|daily)\.json$/.test(x))) {
  for (const d of JSON.parse(readFileSync(join(reviewDir, f), "utf8"))) items.set(d.id, { file: `review/${f}`, d });
}
const LETTERS = ["A", "B", "C", "D"];
const REASONS = { wrong_answer: "answer is wrong", out_of_date: "out of date", unclear: "unclear or typo", other: "something else" };

function describe(id) {
  const it = items.get(id);
  if (!it) return [`  (not in the content files any more)`];
  if (it.q) {
    const q = it.q;
    const answer = q.format === "true_false" ? q.options[q.answerIndex] : `${LETTERS[q.answerIndex]}: ${q.options[q.answerIndex]}`;
    return [`  ${it.file} · ${q.meta.status}${q.meta.reviewer ? ` by ${q.meta.reviewer}` : ""}`, `  Q: ${q.prompt}`, `  Our answer: ${answer}`, `  Reference: ${q.explanation.reference}`];
  }
  const d = it.d;
  const answer = d.answer.verdict === "off" ? `something's off: ${d.answer.targetLabel}` : "looks right";
  return [`  ${it.file} · ${d.meta.status}${d.meta.reviewer ? ` by ${d.meta.reviewer}` : ""}`, `  ${d.heading.value}`, `  Our answer: ${answer}`, `  Reference: ${d.explanation.reference}`];
}

const [cmd, target, status, note, ...rest] = process.argv.slice(2);

if (cmd === "close") {
  const by = rest[rest.indexOf("--by") + 1];
  if (!target || !["fixed", "no_change", "duplicate"].includes(status) || !note || !rest.includes("--by") || !by) {
    console.error('Usage: npm run reports -- close <report id or item id> <fixed|no_change|duplicate> "what was done" --by "Name"');
    process.exit(1);
  }
  let q = db.from("content_reports").update({ status, resolution: note, resolved_by: by }).eq("status", "new");
  q = /^\d+$/.test(target) ? q.eq("id", Number(target)) : q.eq("item_id", target);
  const { data, error } = await q.select("id");
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log(data.length ? `Closed ${data.length} report(s) as ${status}: ${data.map((r) => `#${r.id}`).join(", ")}` : "No open reports matched.");
  process.exit(0);
}

let q = db.from("content_reports").select("*").order("created_at");
if (cmd !== "all") q = q.eq("status", "new");
const { data: reports, error } = await q;
if (error) {
  console.error(error.message);
  process.exit(1);
}
if (!reports.length) {
  console.log(cmd === "all" ? "No reports yet." : "No open reports.");
  process.exit(0);
}

const byItem = new Map();
for (const r of reports) byItem.set(r.item_id, [...(byItem.get(r.item_id) ?? []), r]);
// Most-reported first.
const groups = [...byItem.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`${reports.length} ${cmd === "all" ? "" : "open "}report(s) on ${groups.length} item(s)\n`);
for (const [id, list] of groups) {
  const wrong = list.filter((r) => r.reason === "wrong_answer").length;
  console.log(`${id} · ${list.length} report(s)${wrong >= 3 ? `  ! ${wrong} say the answer is wrong: consider putting it on hold` : ""}`);
  for (const line of describe(id)) console.log(line);
  for (const r of list) {
    const when = new Date(r.created_at).toISOString().slice(0, 16).replace("T", " ");
    const who = r.player_id ? "player" : r.contact_email ? r.contact_email : "visitor";
    console.log(`    #${r.id}  ${when} UTC  ${REASONS[r.reason]}  (${who}, ${r.page ?? "?"})${r.status !== "new" ? `  [${r.status}: ${r.resolution}]` : ""}`);
    if (r.comment) console.log(`         "${r.comment.replace(/\s+/g, " ")}"`);
  }
  console.log("");
}
console.log('To close: npm run reports -- close <#id or item id> <fixed|no_change|duplicate> "what was done" --by "Name"');
