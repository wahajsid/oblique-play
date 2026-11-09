import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
// Run with `npm run test:e2e` (see tests/README.md): needs local Supabase
// running and the built app started by the runner.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SHOTS = join(ROOT, "tests/e2e/.shots");
const DB_URL = process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
import { mkdirSync } from "node:fs";
mkdirSync(SHOTS, { recursive: true });
const base = process.env.TEST_BASE ?? "http://localhost:3005", MAIL = process.env.TEST_MAIL ?? "http://127.0.0.1:54324";
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const sql = (q) => execSync(`psql ${DB_URL} -Atc ${JSON.stringify(q)}`).toString().trim();
const Q = join(ROOT, "src/content/quiz");
const qs = new Map(readdirSync(`${Q}/questions`).filter((x) => x.endsWith(".json") && !x.includes("batch-05")).flatMap((f) => JSON.parse(readFileSync(`${Q}/questions/${f}`, "utf8")).map((q) => [q.id, q])));
const day = JSON.parse(readFileSync(`${Q}/schedule.json`, "utf8"))[0];
const date = day.date;
const sample = JSON.parse(readFileSync(`${Q}/sample.json`, "utf8"));
const uuid = () => crypto.randomUUID();
const post = (ctx, path, body) => ctx.request.post(`${base}${path}`, { data: body });

async function code(to) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json();
    if (list.messages?.length) { const m = await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json(); return m.HTML.match(/letter-spacing:8px;color:#141428;">(\d{6})</)[1]; }
    await new Promise((r) => setTimeout(r, 500));
  }
}
const b = await chromium.launch();
const errors = [];
async function player(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  const email = `${name}.${Date.now()}@example.com`;
  await p.goto(`${base}/signin?next=/quiz`);
  await p.getByLabel("Email address").fill(email);
  await p.getByRole("checkbox").nth(0).check();
  await p.getByRole("button", { name: "Email me a code" }).click();
  await p.getByText("Check your email").first().waitFor({ timeout: 15000 });
  await p.getByLabel("Sign-in code").fill(await code(email));
  await p.getByRole("button", { name: "Sign in" }).click();
  await p.waitForURL(/\/quiz$/, { timeout: 15000 });
  await p.waitForTimeout(1200);
  return { ctx, p, email, id: sql(`select id from players where email='${email}'`) };
}

// ---------- 1. Nobody gets answers without an account
const anon = await b.newContext();
let r = await post(anon, "/api/quiz/check", { date, track: "ct", questionId: day.ct[0], choice: 0 });
let body = await r.json();
ok(r.status() === 401 && !("answerIndex" in body) && !("explanation" in body), `anonymous answer check is refused (${r.status()}), nothing revealed`);
let leaked = 0;
for (const track of ["ct", "vat"]) for (const id of day[track]) { const x = await (await post(anon, "/api/quiz/check", { date, track, questionId: id, choice: 0, attemptId: uuid() })).json(); if ("answerIndex" in x) leaked++; }
ok(leaked === 0, `the 40-question harvest now gets ${leaked} of 40 answers`);
r = await post(anon, "/api/quiz/shown", { date, track: "ct", questionId: day.ct[0], attemptId: uuid() });
ok(r.status() === 401, "anonymous 'question shown' is refused");
r = await post(anon, "/api/quiz/check", { sample: true, questionId: sample[0], choice: 0 });
ok(r.status() === 200 && "answerIndex" in (await r.json()), "the public sample questions still answer without sign-in");
r = await post(anon, "/api/quiz/check", { sample: true, questionId: day.ct[0], choice: 0 });
ok(r.status() === 404, "a real quiz question can't be passed off as a sample");

// ---------- 2. Signed in: the answer comes only after it's stored
const A = await player("fair.a");
r = await post(A.ctx, "/api/quiz/check", { date, track: "ct", questionId: day.ct[0], choice: 0 });
ok(r.status() === 409 && !("answerIndex" in (await r.json())), "signed in but no attempt id: refused, nothing revealed");
const X = uuid();
r = await post(A.ctx, "/api/quiz/shown", { date, track: "ct", questionId: day.ct[0], attemptId: X });
body = await r.json();
ok(r.status() === 200 && body.attemptId === X && body.scored === true, "first question shown starts today's scored attempt");
await new Promise((res) => setTimeout(res, 2100));
r = await post(A.ctx, "/api/quiz/check", { date, track: "ct", questionId: day.ct[0], choice: 0, attemptId: X, timeMs: 0 });
body = await r.json();
ok(r.status() === 200 && "answerIndex" in body && body.scored === true, "the answer is revealed once recorded");
const t = Number(sql(`select time_ms from quiz_answers where attempt_id='${X}' and question_id='${day.ct[0]}'`));
ok(t >= 2000 && t < 6000, `time is measured by the server: device sent 0, server stored ${t} ms after a 2.1 s wait`);

// ---------- 3. No practice round to peek through while the scored round is open
const Y = uuid();
r = await post(A.ctx, "/api/quiz/check", { date, track: "ct", questionId: day.ct[1], choice: 0, attemptId: Y });
body = await r.json();
ok(body.attemptId === X && body.scored === true, "a second attempt id mid-round is folded into the scored round, not a practice round");
ok(sql(`select count(*) from quiz_attempts where player_id='${A.id}' and track='ct'`) === "1", "still only one Corporate Tax attempt exists");
r = await post(A.ctx, "/api/quiz/check", { date, track: "ct", questionId: day.ct[1], choice: 1, attemptId: X });
ok((await r.json()).correct === body.correct, "answering the same question again returns the first result");

// ---------- 4. The mixed quiz is shut until both scored rounds are done
r = await post(A.ctx, "/api/quiz/shown", { date, track: "both", questionId: day.ct[0], attemptId: uuid() });
const mixedIds = (await (await A.ctx.request.get(`${base}/quiz/both/${date}`, { maxRedirects: 0 })).status());
ok(r.status() === 403 || r.status() === 404, `mixed quiz 'shown' refused before the scored rounds (${r.status()})`);
ok(mixedIds === 307 || mixedIds === 308, "opening today's mixed quiz redirects back to the quiz page");
await A.p.goto(`${base}/quiz`);
ok(await A.p.getByTestId("locked-both").isVisible(), "the quiz page shows the mixed quiz as locked, with the reason");

// ---------- 5. Per-player option order, and playing through the real screens
async function playUi(P, track, wrong = 0) {
  await P.p.goto(`${base}/quiz/${track}/${date}`);
  await P.p.getByRole("button", { name: /Start quiz|Carry on|Start practice/ }).click();
  let moved = 0;
  for (let i = 0; i < 20; i++) {
    await P.p.getByRole("button", { name: "Check answer" }).waitFor();
    const prompt = (await P.p.locator("main h1").innerText()).trim();
    const scen = (await P.p.locator("main .bg-paper").count()) ? (await P.p.locator("main .bg-paper").first().innerText()).trim() : "";
    const q = [...qs.values()].find((x) => x.prompt.trim() === prompt && (x.scenario ?? "").trim() === scen);
    const shown = (await P.p.getByRole("radio").allInnerTexts()).map((s) => s.replace(/^\s*(?:[A-D]|\d\.)\s*\n?/, "").replace(/\s+/g, " ").trim());
    const want = q.options[i < wrong ? (q.answerIndex + 1) % q.options.length : q.answerIndex].replace(/\s+/g, " ").trim();
    const at = shown.findIndex((s) => s === want);
    if (shown.join("|") !== q.options.map((o) => o.replace(/\s+/g, " ").trim()).join("|")) moved++;
    await P.p.getByRole("radio").nth(at).click();
    await P.p.getByRole("button", { name: "Check answer" }).click();
    await P.p.getByRole("button", { name: i === 19 ? "See results" : "Next question" }).click();
  }
  await P.p.getByText("By topic").waitFor();
  // The streak arrives with the server's "round finished" reply; wait for it
  // so the next step sees the finished round.
  await P.p.waitForFunction(() => /\d+\s+Day streak/.test(document.querySelector("main").innerText.replace(/\n/g, " ")), null, { timeout: 15000 });
  return { text: await P.p.locator("main").innerText(), moved };
}
const B = await player("fair.b");
const ct = await playUi(B, "ct", 3);
ok(/17\/20/.test(ct.text) && /Scored round/.test(ct.text), "playing by the correct option's text scores 17/20 (3 wrong on purpose): shuffled options are marked correctly");
ok(ct.moved >= 5, `options are in a different order from the written one on ${ct.moved} of 20 questions`);
const stored = sql(`select score||'|'||scored||'|'||(time_ms > 0) from quiz_attempts where player_id='${B.id}' and track='ct'`);
ok(stored === "17|true|true", `server record: ${stored}`);
const serverMs = Number(sql(`select time_ms from quiz_attempts where player_id='${B.id}' and track='ct'`));
const shownTime = ct.text.match(/(\d+):(\d\d)\s*\n?\s*Time/);
ok(!!shownTime && Math.abs(Number(shownTime[1]) * 60 + Number(shownTime[2]) - Math.round(serverMs / 1000)) <= 1, `results screen shows the server's time (${shownTime?.[0]?.replace(/\s+/g, " ")} vs ${Math.round(serverMs / 1000)}s)`);

// After the scored round, a new attempt today is practice
r = await post(B.ctx, "/api/quiz/shown", { date, track: "ct", questionId: day.ct[0], attemptId: uuid() });
ok((await r.json()).scored === false, "after the scored round is finished, a new attempt is practice");

// Mixed opens after both scored rounds
await B.p.goto(`${base}/quiz`);
ok(await B.p.getByTestId("locked-both").isVisible(), "mixed still locked with only Corporate Tax done");
const vat = await playUi(B, "vat", 0);
ok(/20\/20/.test(vat.text), "VAT played through the screens: 20/20");
await B.p.goto(`${base}/quiz`);
ok((await B.p.getByTestId("locked-both").count()) === 0 && (await B.p.locator(`a[href="/quiz/both/${date}"]`).count()) === 1, "mixed quiz unlocks once both scored rounds are finished");
r = await post(B.ctx, "/api/quiz/shown", { date, track: "both", questionId: day.ct[0], attemptId: uuid() });
ok(r.status() === 200 || r.status() === 404, `mixed quiz now accepted by the server (${r.status()})`);

// Two players see different option orders for the same question
const optsFor = async (P, track) => { await P.p.goto(`${base}/quiz/${track}/${date}`); await P.p.getByRole("button", { name: /Start|Carry on/ }).click(); const out = []; for (let i = 0; i < 6; i++) { await P.p.getByRole("button", { name: "Check answer" }).waitFor(); out.push((await P.p.getByRole("radio").allInnerTexts()).join("|")); await P.p.getByRole("radio").first().click(); await P.p.getByRole("button", { name: "Check answer" }).click(); await P.p.getByRole("button", { name: "Next question" }).click(); } return out; };
const C = await player("fair.c");
const D = await player("fair.d");
const [oc, od] = [await optsFor(C, "vat"), await optsFor(D, "vat")];
ok(oc.some((x, i) => x !== od[i]), "two players see at least one of the first 6 questions with options in a different order");

// ---------- 6. Second device picks up the same scored round
const C2 = await b.newContext({ viewport: { width: 390, height: 780 } });
await C2.addCookies(await C.ctx.cookies());
const p2 = await C2.newPage();
await p2.goto(`${base}/quiz/vat/${date}`);
ok(await p2.getByText("Your scored round is already under way.").isVisible() && await p2.getByRole("button", { name: "Carry on" }).isVisible(), "on a second device the intro says the scored round is under way: 'Carry on'");
await p2.getByRole("button", { name: "Carry on" }).click();
await p2.getByRole("button", { name: "Check answer" }).waitFor();
await p2.waitForTimeout(800);
ok(sql(`select count(*) from quiz_attempts where player_id='${C.id}' and track='vat'`) === "1", "carrying on doesn't create a second attempt");

// ---------- 7. The sample round
const s = await (await b.newContext({ viewport: { width: 390, height: 780 }, isMobile: true })).newPage();
s.on("pageerror", (e) => errors.push(e.message));
await s.goto(`${base}/`);
await s.getByRole("link", { name: /Try 5 sample questions/ }).click();
await s.waitForURL(/\/quiz\/sample$/);
for (let i = 0; i < 5; i++) {
  await s.getByRole("button", { name: "Check answer" }).waitFor();
  const q = qs.get(sample[i]);
  await s.getByRole("radio").nth(i < 4 ? q.answerIndex : (q.answerIndex + 1) % q.options.length).click();
  await s.getByRole("button", { name: "Check answer" }).click();
  await s.getByRole("button", { name: i === 4 ? "See how you did" : "Next question" }).click();
}
ok((await s.getByTestId("sample-score").innerText()).startsWith("4 out of 5"), "sample round from the home page: 5 questions, no sign-in, '4 out of 5'");
ok(await s.getByText("an iPhone or Galaxy S26").isVisible(), "the sample result mentions this month's prize");
ok((await s.getByRole("link", { name: "Play today's quiz" }).getAttribute("href")) === "/signin?next=/quiz&src=sample", "its button leads to sign-in, remembering they came from the sample");
await s.screenshot({ path: join(SHOTS, "sample-done.png") });

ok(errors.length === 0, `no page errors (${errors.join("; ")})`);
await b.close();
