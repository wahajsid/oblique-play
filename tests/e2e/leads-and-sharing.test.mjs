import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
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
const date = JSON.parse(readFileSync(`${Q}/schedule.json`, "utf8"))[0].date;
async function code(to) { for (let i = 0; i < 30; i++) { const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json(); if (list.messages?.length) { const m = await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json(); return m.HTML.match(/letter-spacing:8px;color:#141428;">(\d{6})</)[1]; } await new Promise((r) => setTimeout(r, 500)); } }
const tag = Date.now().toString(36).slice(-4).toUpperCase().replace(/[^A-Z0-9]/g, "X");
const CERT = `Cert${tag}`, STRK = `Strk${tag}`;
const b = await chromium.launch();
const errors = [];
async function player(name) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, permissions: ["clipboard-read", "clipboard-write"] });
  const p = await ctx.newPage(); p.on("pageerror", (e) => errors.push(e.message));
  const email = `${name}.${Date.now()}@example.com`;
  await p.goto(`${base}/signin?next=/quiz`); await p.getByLabel("Email address").fill(email); await p.getByRole("checkbox").nth(0).check();
  await p.getByRole("button", { name: "Email me a code" }).click(); await p.getByText("Check your email").first().waitFor({ timeout: 15000 });
  await p.getByLabel("Sign-in code").fill(await code(email)); await p.getByRole("button", { name: "Sign in" }).click(); await p.waitForURL(/\/quiz$/, { timeout: 15000 }); await p.waitForTimeout(1200);
  return { ctx, p, email, id: sql(`select id from players where email='${email}'`) };
}
async function playUi(P, track, wrong) {
  await P.p.goto(`${base}/quiz/${track}/${date}`);
  await P.p.getByRole("button", { name: /Start quiz|Carry on|Start practice/ }).click();
  for (let i = 0; i < 20; i++) {
    await P.p.getByRole("button", { name: "Check answer" }).waitFor();
    const prompt = (await P.p.locator("main h1").innerText()).trim();
    const scen = (await P.p.locator("main .bg-paper").count()) ? (await P.p.locator("main .bg-paper").first().innerText()).trim() : "";
    const q = [...qs.values()].find((x) => x.prompt.trim() === prompt && (x.scenario ?? "").trim() === scen);
    const shown = (await P.p.getByRole("radio").allInnerTexts()).map((s) => s.replace(/^\s*(?:[A-D]|\d\.)\s*\n?/, "").replace(/\s+/g, " ").trim());
    const want = q.options[wrong(q, i) ? (q.answerIndex + 1) % q.options.length : q.answerIndex].replace(/\s+/g, " ").trim();
    await P.p.getByRole("radio").nth(shown.findIndex((s) => s === want)).click();
    await P.p.getByRole("button", { name: "Check answer" }).click();
    await P.p.getByRole("button", { name: i === 19 ? "See results" : "Next question" }).click();
  }
  await P.p.getByText("By topic").waitFor();
}

// A finance professional gets every transfer pricing question wrong, the rest right
const A = await player("lead.a");
const day = JSON.parse(readFileSync(`${Q}/schedule.json`, "utf8"))[0];
const topicCount = {}; for (const id of day.ct) topicCount[qs.get(id).topic] = (topicCount[qs.get(id).topic] ?? 0) + 1;
const weakKey = Object.entries(topicCount).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1])[0][0];
const topics = JSON.parse(readFileSync(`${Q}/topics.json`, "utf8")).ct;
await playUi(A, "ct", (q) => q.topic === weakKey);
const n = topicCount[weakKey];
ok(await A.p.getByRole("heading", { name: "Make it yours" }).isVisible(), "after a first quiz the player is asked who they are (previously only after a document shift)");
ok(await A.p.getByLabel(/Company/).isVisible(), "the card has a Company field");
const offer = A.p.getByTestId("topic-offer");
ok(await offer.isVisible() && (await offer.innerText()).includes(`${topics[weakKey]}`) && (await offer.innerText()).includes(`0/${n}`), `the offer names the weak topic: "${topics[weakKey]} · 0/${n} today"`);
await A.p.screenshot({ path: join(SHOTS, "lead-results.png"), fullPage: true });
await A.p.getByLabel("Display name").fill("Sara");
await A.p.getByLabel(/Company/).fill("  Palm  Grove Trading LLC ");
await A.p.getByRole("radio", { name: "Finance professional" }).click();
await A.p.getByRole("button", { name: "Save" }).click();
await A.p.getByText("Saved. You can change these any time").waitFor();
ok(sql(`select display_name||'|'||company||'|'||role from players where id='${A.id}'`) === "Sara|Palm Grove Trading LLC|finance_professional", "name, company and role saved (spaces tidied)");
await A.p.waitForTimeout(800);
ok(sql(`select weak_topic from players where id='${A.id}'`) === `Corporate Tax: ${topics[weakKey]} (0/${n})`, `weakest topic stored for HubSpot: ${sql(`select weak_topic from players where id='${A.id}'`)}`);
ok(await offer.isVisible(), "a finance professional (not only business owners) still sees the matched offer");
let r = await A.ctx.request.post(`${base}/diagnostic`, { form: { topic: `ct-${weakKey}` }, maxRedirects: 0 });
const loc = new URL(r.headers()["location"]);
ok(r.status() === 303 && loc.hostname === "calendly.com" && loc.searchParams.get("utm_content") === `ct-${weakKey}` && loc.searchParams.get("name") === "Sara", `booking carries the topic and the player's name to Calendly (utm_content=${loc.searchParams.get("utm_content")})`);
r = await A.ctx.request.post(`${base}/diagnostic`, { form: { topic: "<script>" }, maxRedirects: 0 });
ok(!new URL(r.headers()["location"]).searchParams.has("utm_content"), "a malformed topic is dropped");

// Pasteable result
await A.p.getByTestId("copy-result").click();
const pasted = await A.p.evaluate(() => navigator.clipboard.readText());
const lines = pasted.split("\n");
console.log(pasted.split("\n").map((l) => "   | " + l).join("\n"));
const squares = [...(lines[2] + lines[3])];
const dayLabel = new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
ok(lines[0] === `UAE Corporate Tax quiz · ${dayLabel}` && lines[1].startsWith(`${20 - n}/20 in `), "pasteable result: title and score lines");
ok(squares.length === 20 && squares.filter((c) => c === "🟩").length === 20 - n && squares.filter((c) => c === "⬜").length === n, `20 squares, ${20 - n} green and ${n} white, no answers given away`);
ok(lines[4] === new URL(base).host, "ends with the game's address");
ok(await A.p.getByText("Copied. Paste it anywhere").isVisible(), "the button confirms the copy");

// A student sees no sales offer
const S = await player("lead.s");
sql(`update players set role='student', display_name='Stu' where id='${S.id}'`);
await playUi(S, "ct", () => true);
ok((await S.p.getByTestId("topic-offer").count()) === 0 && (await S.p.getByText("Book a free").count()) === 0, "students aren't shown a sales offer");

// Link preview for the main link
const home = await (await fetch(base)).text();
ok(/property="og:image" content="[^"]*\/card"/.test(home) && home.includes('property="og:title" content="Think you know UAE tax? Prove it in 3 minutes."'), "the home page now has a share title and image");
const card = await fetch(`${base}/card`); const buf = Buffer.from(await card.arrayBuffer());
ok(card.headers.get("content-type") === "image/png" && buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630, "the share image is a 1200×630 PNG");
writeFileSync(join(SHOTS, "home-card.png"), buf);
const quizPage = await (await fetch(`${base}/quiz`)).text();
ok(/property="og:image" content="[^"]*\/card"/.test(quizPage), "other pages inherit it");
const spot = await (await fetch(`${base}/spot-the-error`)).text();
ok(/property="og:image" content="[^"]*\/spot-the-error\/card"/.test(spot), "pages with their own preview keep it");

// Certificate: add to LinkedIn profile
sql(`insert into milestones(code,player_id,kind,value,name) values ('${CERT}','${A.id}','certificate',6,'Sara')`);
await A.p.goto(`${base}/m/${CERT}`);
const add = new URL(await A.p.getByRole("link", { name: /Add it to your LinkedIn profile/ }).getAttribute("href"));
ok(add.hostname === "www.linkedin.com" && add.pathname === "/profile/add" && add.searchParams.get("name") === "UAE VAT Document Review" && add.searchParams.get("organizationName") === "Oblique Consult" && add.searchParams.get("certId") === CERT && add.searchParams.get("certUrl").endsWith(`/m/${CERT}`) && add.searchParams.get("issueYear") === "2026", "certificate page offers 'Add it to your LinkedIn profile' with name, issuer, date, link and id filled in");
sql(`insert into milestones(code,player_id,kind,value,name) values ('${STRK}','${A.id}','streak',7,'Sara')`);
await A.p.goto(`${base}/m/${STRK}`);
ok((await A.p.getByRole("link", { name: /LinkedIn profile/ }).count()) === 0, "streak cards don't offer it");
ok(errors.length === 0, `no page errors (${errors.join("; ")})`);
await b.close();
