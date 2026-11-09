import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
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
const sh = (cmd) => { try { return { out: execSync(cmd, { cwd: ROOT, stdio: "pipe" }).toString(), code: 0 }; } catch (e) { return { out: e.stdout.toString() + e.stderr.toString(), code: e.status }; } };
const shift1 = JSON.parse(readFileSync(join(ROOT, "src/content/review/shift-1.json"), "utf8"));
const ctIds = JSON.parse(readFileSync(join(ROOT, "src/content/quiz/questions/ct-batch-01.json"), "utf8")).map((q) => q.id);
sql("delete from content_reports");

const post = (body, ip = "198.51.100.7") =>
  fetch(`${base}/api/report`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: JSON.stringify(body) });
const count = (where = "true") => Number(sql(`select count(*) from content_reports where ${where}`));

const b = await chromium.launch();
const errors = [];
const page = async () => { const c = await b.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }); const p = await c.newPage(); p.on("pageerror", (e) => errors.push(e.message)); return p; };

// 1. A visitor on the public puzzle page
const p = await page();
await p.goto(`${base}/spot-the-error`);
await p.getByRole("button", { name: "Looks right" }).click();
const link = p.getByRole("button", { name: "Report a problem with this answer" });
await link.waitFor();
ok(true, "after answering, 'Report a problem with this answer' shows under the explanation");
await link.click();
const send = p.getByRole("button", { name: "Send report" });
ok(await send.isDisabled(), "Send is disabled until a reason is chosen");
await p.getByLabel("The law or reference is out of date").check();
await p.getByLabel("Details (optional)").fill("Article 59 was amended in 2026.");
ok(await p.getByLabel("Your email, if you'd like a reply (optional)").isVisible(), "a signed-out visitor can leave an email for a reply");
await p.getByLabel("Your email, if you'd like a reply (optional)").fill("Visitor@Example.com");
await p.screenshot({ path: join(SHOTS, `1-form.png`) });
await send.click();
await p.getByText("Thanks. Oblique's tax team checks every report and will reply by email.").waitFor();
ok(true, "visitor sees 'Thanks… will reply by email'");
await p.screenshot({ path: join(SHOTS, `2-thanks.png`) });
const row = sql("select item_id||'|'||item_kind||'|'||reason||'|'||coalesce(contact_email,'')||'|'||coalesce(page,'')||'|'||(player_id is null)||'|'||(ip_hash is not null)||'|'||status from content_reports");
ok(row === "d-001|document|out_of_date|visitor@example.com|/spot-the-error|true|true|new", `stored: ${row}`);
ok(count("comment = 'Article 59 was amended in 2026.'") === 1, "the comment is stored");
ok(!sql("select ip_hash from content_reports").includes("."), "the IP address itself isn't stored, only a hash");

// 2. The server's checks
let r = await post({ itemId: "d-001", kind: "document", reason: "unclear" }, "203.0.113.50");
ok(r.status === 200, "another visitor can report the same item");
const before = count();
r = await post({ itemId: "d-001", kind: "document", reason: "wrong_answer" }, "203.0.113.50");
ok(r.status === 200 && count() === before, "the same visitor reporting the same item again that day: thanked, nothing new stored");
ok((await post({ itemId: "nope-999", kind: "question", reason: "unclear" })).status === 400, "an item that doesn't exist is refused");
ok((await post({ itemId: "d-001", kind: "question", reason: "unclear" })).status === 400, "a document sent as a question is refused");
ok((await post({ itemId: "d-001", kind: "document", reason: "rude" })).status === 400, "an unknown reason is refused");
r = await post({ itemId: "d-002", kind: "document", reason: "other" });
ok(r.status === 400 && (await r.json()).error === "Please tell us what's wrong.", "'Something else' needs a comment");
ok((await post({ itemId: "d-002", kind: "document", reason: "unclear", email: "not-an-email" })).status === 400, "a malformed email is refused");
const c0 = count();
r = await post({ itemId: "d-003", kind: "document", reason: "unclear", website: "http://spam.example" });
ok(r.status === 200 && count() === c0, "spam that fills the hidden field is thanked and dropped");
ok((await post({ itemId: "d-004", kind: "document", reason: "unclear", comment: "x".repeat(5000) }, "203.0.113.60")).status === 200 && Number(sql("select max(char_length(comment)) from content_reports")) === 1000, "a very long comment is cut to 1,000 characters");

// 3. Ten an hour per device
const ip = "192.0.2.77";
const codes = [];
for (let i = 0; i < 11; i++) codes.push((await post({ itemId: ctIds[i], kind: "question", reason: "unclear" }, ip)).status);
ok(codes.slice(0, 10).every((c) => c === 200) && codes[10] === 429, `10 reports an hour per device, the 11th is refused (${codes.join(",")})`);
ok(count("item_kind = 'question'") === 10, "questions can be reported (10 stored)");

// 4. A signed-in player in a shift: no email field, linked to their account
async function code(to) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json();
    if (list.messages?.length) { const m = await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json(); return m.HTML.match(/letter-spacing:8px;color:#141428;">(\d{6})</)[1]; }
    await new Promise((r) => setTimeout(r, 500));
  }
}
const email = `reporter.${Date.now()}@example.com`;
const s = await page();
await s.goto(`${base}/signin?next=/review/1`);
await s.getByLabel("Email address").fill(email);
await s.getByRole("checkbox").nth(0).check();
await s.getByRole("button", { name: "Email me a code" }).click();
await s.getByText("Check your email").waitFor({ timeout: 15000 });
await s.getByLabel("Sign-in code").fill(await code(email));
await s.getByRole("button", { name: "Sign in" }).click();
await s.waitForURL(/\/review\/1$/, { timeout: 15000 });
await s.getByRole("button", { name: "Start shift" }).click();
await s.getByRole("button", { name: "Looks right" }).click();
await s.getByRole("button", { name: "Report a problem with this answer" }).click();
ok((await s.getByLabel("Your email, if you'd like a reply (optional)").count()) === 0, "signed-in players aren't asked for an email (we have it)");
await s.getByLabel("The answer is wrong").check();
await s.getByRole("button", { name: "Send report" }).click();
await s.getByText("Thanks. Oblique's tax team checks every report.").waitFor();
const pid = sql(`select id from players where email='${email}'`);
ok(sql(`select item_id||'|'||coalesce(contact_email,'none')||'|'||page from content_reports where player_id='${pid}'`) === `${shift1[0].id}|none|/review/1`, "the shift report is linked to the player, no email copied");
await s.getByRole("button", { name: /Next document|See results/ }).click();
await s.getByRole("button", { name: "Looks right" }).click();
await s.getByRole("button", { name: "Report a problem with this answer" }).waitFor({ timeout: 10000 });
ok((await s.getByText("Thanks. Oblique's tax team checks every report.").count()) === 0, "the next document gets a fresh report link, not the previous thank-you");

// 5. The team's command
let out = sh("npm run reports");
ok(out.code === 0 && /open report\(s\) on/.test(out.out) && out.out.includes("d-001 · 2 report(s)") && out.out.includes("Our answer: looks right") && out.out.includes("visitor@example.com"), "npm run reports lists open reports by item, with our answer and the reply email");
ok(out.out.indexOf("d-001 · 2") < out.out.indexOf(ctIds[0]), "most-reported items come first");
out = sh(`npm run reports -- close d-001 no_change "Article 59(1) still applies as amended; reference is right." --by "Aidarous"`);
ok(out.code === 0 && /Closed 2 report\(s\) as no_change/.test(out.out), "closing by item id closes all its open reports");
ok(sql("select count(*) from content_reports where item_id='d-001' and status='no_change' and resolved_at is not null and resolved_by='Aidarous'") === "2", "closed reports record who, when and what was done");
out = sh("npm run reports");
ok(!out.out.includes("d-001 ·"), "closed reports drop off the open list");
out = sh("npm run reports -- close 99999 fixed note");
ok(out.code === 1 && /Usage/.test(out.out), "closing without --by is refused with the usage line");

ok(errors.length === 0, `no page errors (${errors.join("; ")})`);
await b.close();
