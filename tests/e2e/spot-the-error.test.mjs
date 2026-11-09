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
const base = process.env.TEST_BASE ?? "http://localhost:3005";
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const sql = (q) => execSync(`psql ${DB_URL} -Atc ${JSON.stringify(q)}`).toString().trim();
const daily = JSON.parse(readFileSync(join(ROOT, "src/content/review/daily.json"), "utf8"));
const doc = daily[0]; // before launch the preview shows d-001

const b = await chromium.launch();
const errors = [];
const page = async (opts = {}) => {
  const c = await b.newContext({ viewport: { width: 375, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...opts });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  return p;
};
const attemptsBefore = sql("select count(*) from review_attempts");

// Headers: link preview, framing rules
const res = await fetch(`${base}/spot-the-error`);
const html = await res.text();
ok(res.headers.get("content-security-policy") === "frame-ancestors 'none'", "the puzzle page refuses to be framed by other sites");
ok(/property="og:image" content="[^"]*\/spot-the-error\/card"/.test(html), "link preview image is set");
ok(!html.includes(doc.explanation.what.slice(0, 40)), "the page's HTML doesn't contain the answer");
const card = await fetch(`${base}/spot-the-error/card`);
const buf = Buffer.from(await card.arrayBuffer());
ok(card.headers.get("content-type") === "image/png" && buf.readUInt32BE(16) === 1200 && buf.readUInt32BE(20) === 630, "preview image is a 1200×630 PNG");
require_write: {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(SHOTS, `og-card.png`), buf);
}
const emb = await fetch(`${base}/embed/spot-the-error`);
const csp = emb.headers.get("content-security-policy") ?? "";
ok(csp.startsWith("frame-ancestors 'self'") && csp.includes("https://obliqueconsult.com") && csp.includes("framer"), "the embed box may be framed by obliqueconsult.com and Framer");
ok((await fetch(`${base}/`)).headers.get("content-security-policy") === "frame-ancestors 'none'", "the rest of the game refuses to be framed");

// A visitor gets it right (d-001 is a correct invoice)
const p = await page();
await p.goto(`${base}/spot-the-error`);
ok(await p.getByRole("heading", { name: /Right, or is something off/ }).isVisible(), "puzzle page shows the heading");
ok(await p.getByText("Spot the error ·").isVisible(), "shows 'Spot the error · date'");
ok((await p.getByText(/sign in/i).count()) === 0, "no sign-in needed");
await p.screenshot({ path: join(SHOTS, `1-puzzle.png`) });
await p.getByRole("button", { name: "Looks right" }).click();
await p.getByText(doc.explanation.what.slice(0, 30)).waitFor();
ok(true, "answer and explanation appear straight away");
await p.screenshot({ path: join(SHOTS, `2-feedback.png`) });
await p.getByRole("button", { name: /See results|Next|Done|Finish/ }).first().click();
await p.getByText("Spot on today.").waitFor();
ok(await p.getByRole("link", { name: /Play the full game/ }).first().isVisible(), "after answering: 'Play the full game'");
ok(await p.getByRole("button", { name: "Challenge a colleague" }).isVisible() && await p.getByRole("button", { name: "Book a free call" }).isVisible(), "…plus 'Challenge a colleague' and 'Book a free call'");
await p.screenshot({ path: join(SHOTS, `3-done.png`), fullPage: true });
await p.reload();
ok(await p.getByText("Spot on today.").isVisible(), "coming back the same day shows the result, not the puzzle again");
await p.getByRole("button", { name: "Challenge a colleague" }).click();
ok(await p.getByText("Copy link").isVisible() || await p.getByRole("button", { name: /Copy/ }).first().isVisible(), "share panel opens");
await p.keyboard.press("Escape");

// A visitor gets it wrong
const q = await page();
await q.goto(`${base}/spot-the-error`);
await q.getByRole("button", { name: "Something's off" }).click();
await q.locator('[data-part="supplier-trn"]').first().click();
await q.getByRole("button", { name: "Flag it" }).click();
await q.getByText(doc.explanation.what.slice(0, 30)).waitFor();
await q.getByRole("button", { name: /See results|Next|Done|Finish/ }).first().click();
ok(await q.getByText("Not quite today.").isVisible(), "a wrong answer says 'Not quite today.'");
ok(sql("select count(*) from review_attempts") === attemptsBefore, "anonymous answers aren't stored");

// Header link carries where they came from
await q.getByRole("link", { name: "Play the full game" }).first().click();
await q.waitForURL(`${base}/?utm_source=spot-the-error`);
const cookies = await q.context().cookies();
ok(cookies.some((c) => c.name === "ob_src" && c.value === "spot-the-error"), "'Play the full game' remembers the visitor came from the puzzle");

// The in-game daily document still needs sign-in
const g = await page();
await g.goto(`${base}/review/daily`);
ok(await g.getByText("You'll sign in with your email to see the answer.").isVisible(), "the in-game daily document still asks players to sign in");

// Embed box
const e = await page({ viewport: { width: 360, height: 200 } });
await e.goto(`${base}/embed/spot-the-error`);
const link = e.getByRole("link");
ok((await link.getAttribute("href")).endsWith("/spot-the-error?utm_source=website") && (await link.getAttribute("target")) === "_blank", "embed box opens the puzzle in a new tab, tagged utm_source=website");
await e.screenshot({ path: join(SHOTS, `embed-360x200.png`) });
const e2 = await page({ viewport: { width: 560, height: 220 }, isMobile: false, hasTouch: false, deviceScaleFactor: 2 });
await e2.goto(`${base}/embed/spot-the-error`);
await e2.screenshot({ path: join(SHOTS, `embed-560x220.png`) });

// Desktop view
const d = await page({ viewport: { width: 1280, height: 820 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 });
await d.goto(`${base}/spot-the-error`);
await d.screenshot({ path: join(SHOTS, `desktop.png`) });

ok(errors.length === 0, `no page errors (${errors.join("; ")})`);
await b.close();
