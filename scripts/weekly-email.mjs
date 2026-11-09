// Writes the weekly email: "3 questions most players got wrong this week".
//
//   npm run weekly:email                    the 7 days up to yesterday (UAE time)
//   npm run weekly:email -- 2026-12-07      the 7 days ending on that date
//   npm run weekly:email -- 2026-12-07 --min 20   only questions answered by at least 20 players (default 10)
//
// It reads scored quiz answers, finds the three questions with the lowest
// share of correct answers, and writes emails/weekly-<date>.html and .txt.
// Paste the HTML into a HubSpot marketing email and send it to players who
// agreed to marketing; HubSpot adds the unsubscribe link. It also prints the
// hardest question as a LinkedIn poll. See docs/WEEKLY-EMAIL.md.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, from the
// environment or .env.local.

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
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
const args = process.argv.slice(2);
const uaeToday = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const end = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? addDays(uaeToday, -1);
const start = addDays(end, -6);
const min = Number(args[args.indexOf("--min") + 1]) > 0 && args.includes("--min") ? Number(args[args.indexOf("--min") + 1]) : 10;
const site = "https://play.obliqueconsult.com";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or put them in .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Every question, to show its text and explanation.
const questions = new Map();
const dir = join(root, "src/content/quiz/questions");
for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
  for (const q of JSON.parse(readFileSync(join(dir, f), "utf8"))) questions.set(q.id, q);
}
const topics = JSON.parse(readFileSync(join(root, "src/content/quiz/topics.json"), "utf8"));

// Scored answers for the week, a page at a time (the API returns at most 1,000 rows).
const stats = new Map();
const players = new Set();
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from("quiz_answers")
    .select("question_id, correct, quiz_attempts!inner(player_id, set_date, scored)")
    .eq("quiz_attempts.scored", true)
    .gte("quiz_attempts.set_date", start)
    .lte("quiz_attempts.set_date", end)
    .order("answered_at")
    .range(from, from + 999);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  for (const a of data) {
    const s = stats.get(a.question_id) ?? { answered: 0, right: 0 };
    s.answered++;
    if (a.correct) s.right++;
    stats.set(a.question_id, s);
    players.add(a.quiz_attempts.player_id);
  }
  if (data.length < 1000) break;
}

const ranked = [...stats.entries()]
  .filter(([id, s]) => s.answered >= min && questions.has(id))
  .map(([id, s]) => ({ q: questions.get(id), ...s, pct: Math.round((100 * s.right) / s.answered) }))
  .sort((a, b) => a.right / a.answered - b.right / b.answered || b.answered - a.answered);
const hardest = ranked.slice(0, 3);
if (hardest.length < 3) {
  console.error(`Only ${ranked.length} question(s) had at least ${min} scored answers between ${start} and ${end}. Try a lower --min, or wait for more players.`);
  process.exit(1);
}

const { count: consenting } = await db.from("players").select("id", { count: "exact", head: true }).eq("marketing_consent", true);
const LETTERS = ["A", "B", "C", "D"];
const TRACK = { ct: "Corporate Tax", vat: "VAT" };
const pretty = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const label = (q, i) => (q.format === "true_false" ? q.options[i] : q.format === "spot_issue" ? `Line ${i + 1}` : LETTERS[i]);
const answerText = (q) => (q.format === "true_false" ? q.options[q.answerIndex] : `${label(q, q.answerIndex)}: ${q.options[q.answerIndex]}`);
const link = `${site}/?utm_source=weekly-email&utm_medium=email&utm_campaign=most-missed-${end}`;
const subject = "3 UAE tax questions most players got wrong this week";
const intro = `${players.size} ${players.size === 1 ? "person" : "people"} played Oblique's UAE tax game between ${pretty(start)} and ${pretty(end)}. These three questions caught the most of them out. See how you do before reading the answers.`;

// ---- plain text
const text = [
  subject,
  "",
  intro,
  "",
  ...hardest.flatMap((h, n) => [
    `${n + 1}. ${TRACK[h.q.track]} · ${topics[h.q.track][h.q.topic]} · ${h.pct}% got it right`,
    ...(h.q.scenario ? [h.q.scenario] : []),
    h.q.prompt,
    ...(h.q.format === "true_false" ? [] : h.q.options.map((o, i) => `   ${label(h.q, i)}. ${o}`)),
    "",
    `Answer: ${answerText(h.q)}`,
    h.q.explanation.what,
    h.q.explanation.why,
    `(${h.q.explanation.reference})`,
    "",
  ]),
  `Today's 20 questions: ${link}`,
  "",
  "[One line about an Oblique service, if you want one this week.]",
  "",
  "For learning purposes only. Not tax advice.",
].join("\n");

// ---- HTML (simple, email-safe markup in Oblique's colours)
const block = (h, n) => `
  <tr><td style="padding:24px 0 0;">
    <p style="margin:0;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#3c3c7f;font-weight:bold;">${n + 1} · ${esc(TRACK[h.q.track])} · ${esc(topics[h.q.track][h.q.topic])}</p>
    <p style="margin:6px 0 0;font-size:13px;color:#8a4b00;font-weight:bold;">Only ${h.pct}% got this right</p>
    ${h.q.scenario ? `<p style="margin:10px 0 0;padding:12px 14px;background:#faf7f1;border:1px solid #e6e0d3;border-radius:10px;font-size:15px;line-height:1.5;color:#141428;">${esc(h.q.scenario)}</p>` : ""}
    <p style="margin:10px 0 0;font-size:17px;line-height:1.4;font-weight:bold;color:#141428;">${esc(h.q.prompt)}</p>
    ${h.q.format === "true_false" ? "" : `<p style="margin:8px 0 0;font-size:15px;line-height:1.6;color:#141428;">${h.q.options.map((o, i) => `<b>${label(h.q, i)}.</b> ${esc(o)}`).join("<br>")}</p>`}
    <p style="margin:14px 0 0;padding:12px 14px;background:#e3f3ec;border-radius:10px;font-size:15px;line-height:1.5;color:#141428;"><b>Answer: ${esc(answerText(h.q))}</b><br>${esc(h.q.explanation.what)} ${esc(h.q.explanation.why)}<br><span style="font-size:13px;color:#5f6170;">${esc(h.q.explanation.reference)}</span></p>
  </td></tr>`;
const html = `<!doctype html>
<html lang="en"><body style="margin:0;background:#fbfafb;font-family:Arial,Helvetica,sans-serif;color:#141428;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
  <tr><td style="font-size:22px;font-weight:bold;letter-spacing:-0.5px;">ob/co</td></tr>
  <tr><td style="padding:18px 0 0;">
    <h1 style="margin:0;font-size:26px;line-height:1.2;">3 questions most players got wrong this week</h1>
    <p style="margin:10px 0 0;font-size:15px;line-height:1.5;color:#5f6170;">${esc(intro)}</p>
  </td></tr>
  ${hardest.map(block).join("")}
  <tr><td align="center" style="padding:28px 0 0;">
    <a href="${link}" style="display:inline-block;background:#adebf2;border:1px solid #8fd8e2;border-radius:999px;padding:14px 28px;font-size:16px;font-weight:bold;color:#141428;text-decoration:none;">Play today's 20 questions</a>
  </td></tr>
  <tr><td style="padding:22px 0 0;font-size:15px;line-height:1.5;color:#141428;">[One line about an Oblique service, if you want one this week.]</td></tr>
  <tr><td style="padding:22px 0 0;font-size:12px;line-height:1.5;color:#5f6170;">For learning purposes only. Not tax advice. A learning game by Oblique.</td></tr>
</table></td></tr></table>
</body></html>
`;

const out = join(root, "emails");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, `weekly-${end}.html`), html);
writeFileSync(join(out, `weekly-${end}.txt`), text);

console.log(`Week ${start} to ${end}: ${players.size} players, ${ranked.length} questions with at least ${min} answers.\n`);
hardest.forEach((h, n) => console.log(`  ${n + 1}. ${h.q.id}  ${h.pct}% right (${h.right} of ${h.answered})  ${h.q.prompt.slice(0, 70)}`));
console.log(`\nWrote emails/weekly-${end}.html and .txt`);
console.log(`Subject: ${subject}`);
console.log(`Players who agreed to marketing: ${consenting ?? 0}`);

// The hardest question as a LinkedIn poll (4 options of up to 30 characters each).
const top = hardest[0];
console.log("\nLinkedIn poll for Tuesday:");
console.log(`  "Only ${top.pct}% of players got this one right this week."`);
console.log(`  ${top.q.scenario ? `${top.q.scenario} ` : ""}${top.q.prompt}`);
if (top.q.format === "true_false" || top.q.options.some((o) => o.length > 30)) {
  console.log("  (Its options don't fit a poll's 30 characters: post it as text or an image, with the answer in the comments.)");
} else {
  top.q.options.forEach((o) => console.log(`   - ${o}`));
}
