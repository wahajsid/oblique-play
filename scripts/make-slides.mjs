// Makes a "spot the error" LinkedIn post from one document: a 6-slide PDF
// (upload it as a LinkedIn "document"), the same slides as 1080×1350 PNGs,
// and a caption with the answer for the first comment.
//
//   npm run slides -- 2026-12-01     the daily document for that date
//   npm run slides -- s1-03          any document by id
//
// Files go to slides/<date or id>/. First time on a laptop, also run:
//   npx playwright install chromium
//
// It starts its own copy of the app with the slides page switched on (the
// live site never shows it), takes the pictures, then stops it.

import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const id = process.argv[2];
if (!id || !/^(\d{4}-\d{2}-\d{2}|[a-z0-9-]+)$/.test(id)) {
  console.error("Usage: npm run slides -- <YYYY-MM-DD | document id>");
  process.exit(1);
}

// Find the document here too, for the caption and the draft warning.
const read = (f) => JSON.parse(readFileSync(join(root, "src/content/review", f), "utf8"));
const daily = read("daily.json");
const all = [...daily, ...[1, 2, 3, 4, 5, 6].flatMap((n) => read(`shift-${n}.json`))];
const DAILY_START = "2026-12-01";
let date = null;
let doc;
if (/^\d{4}-\d{2}-\d{2}$/.test(id)) {
  if (id < DAILY_START) {
    console.error(`Daily documents start on ${DAILY_START}.`);
    process.exit(1);
  }
  date = id;
  const days = Math.round((Date.parse(`${id}T00:00:00Z`) - Date.parse(`${DAILY_START}T00:00:00Z`)) / 86_400_000);
  doc = daily[days % daily.length];
} else {
  doc = all.find((d) => d.id === id);
}
if (!doc) {
  console.error(`No document "${id}".`);
  process.exit(1);
}

const port = 3123;
const base = `http://localhost:${port}`;
if (await fetch(base).then(() => true, () => false)) {
  console.error(`Port ${port} is busy. Stop whatever is running there and try again.`);
  process.exit(1);
}

console.log(`Making slides for ${doc.id}${date ? ` (daily document for ${date})` : ""}…`);
// Run Next directly (not through npx) so stopping it really stops it.
const server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "dev", "-p", String(port)], {
  cwd: root,
  env: { ...process.env, SLIDES_ENABLED: "true" },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => server.kill("SIGTERM");

try {
  const url = `${base}/slides/${id}`;
  // The first request also compiles the page, which takes a little while.
  let ok = false;
  for (let i = 0; i < 120 && !ok; i++) {
    ok = await fetch(url).then((r) => r.ok, () => false);
    if (!ok) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!ok) throw new Error(`The slides page didn't load.\n${serverLog.slice(-2000)}`);

  const outDir = join(root, "slides", date ?? doc.id);
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 540, height: 675 }, deviceScaleFactor: 2, colorScheme: "light" });
  await page.goto(url);
  await page.locator('[data-ready="true"]').waitFor({ timeout: 30_000 });

  const slides = page.locator(".slide");
  const count = await slides.count();
  for (let i = 0; i < count; i++) {
    await slides.nth(i).screenshot({ path: join(outDir, `slide-${i + 1}.png`), animations: "disabled" });
  }
  const pdfName = `spot-the-error-${date ?? doc.id}.pdf`;
  await page.pdf({ path: join(outDir, pdfName), width: "540px", height: "675px", printBackground: true });
  await browser.close();

  const answer =
    doc.answer.verdict === "off"
      ? `Something's off: ${doc.answer.targetLabel}.`
      : "Nothing's off. This one is correct.";
  const caption = `POST (attach ${pdfName} as a document; give it the title "Spot the error")

Would you approve this ${doc.heading.value.toLowerCase()}?

Swipe through, make your call, and check the answer on slide 4.
${date ? `\nEveryone playing Oblique's UAE tax game got this exact document on ${new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}. There's a new one every day.\n` : ""}
Play free: play.obliqueconsult.com

#UAETax #VAT #UAEVAT #Accounting #Finance


FIRST COMMENT (post a day later, or straight away if you prefer)

${answer}

${doc.explanation.what}

${doc.explanation.why}

The law: ${doc.explanation.reference}
`;
  writeFileSync(join(outDir, "caption.txt"), caption);

  console.log(`\nDone: ${count} slides in slides/${date ?? doc.id}/`);
  console.log(`  ${pdfName}   upload to LinkedIn as a document`);
  console.log(`  slide-1.png … slide-${count}.png   1080×1350, for Instagram or WhatsApp`);
  console.log("  caption.txt   post text and the answer for the first comment");
  if (doc.meta.status !== "approved") {
    console.log(`\n! ${doc.id} isn't approved by a reviewer yet, so every slide is stamped DRAFT. Don't post it until it's approved.`);
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  stop();
}
