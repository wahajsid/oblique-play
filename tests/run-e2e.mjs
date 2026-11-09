// Runs the browser tests in tests/e2e against the built app and a local
// Supabase. `npm run test:e2e`   (see tests/README.md for the one-time setup)
//
// It starts the app itself on port 3005, pinned to the first scheduled quiz
// day so there is always a quiz to play, with prizes switched on.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "tests/e2e");
const base = process.env.TEST_BASE ?? "http://localhost:3005";
if (!existsSync(join(root, ".next/BUILD_ID"))) {
  console.error("Build the app first: npm run build");
  process.exit(1);
}
const firstDay = JSON.parse(readFileSync(join(root, "src/content/quiz/schedule.json"), "utf8"))[0]?.date;
if (!firstDay) {
  console.error("The quiz schedule is empty: run npm run quiz:schedule first.");
  process.exit(1);
}

const server = spawn(process.execPath, [join(root, "node_modules/next/dist/bin/next"), "start", "-p", new URL(base).port || "3005"], {
  cwd: root,
  env: { ...process.env, PREVIEW_TODAY: firstDay, PRIZES_ENABLED: "true" },
  stdio: "ignore",
});
const stop = () => server.kill("SIGTERM");
process.on("exit", stop);

let ready = null;
for (let i = 0; i < 60 && !ready; i++) {
  ready = await fetch(`${base}/api/health`).then((r) => r.json(), () => null);
  if (!ready) await new Promise((r) => setTimeout(r, 1000));
}
if (!ready?.ok) {
  console.error(`The app isn't healthy at ${base}: ${JSON.stringify(ready)}. Is local Supabase running (npx supabase start) and .env.local filled in?`);
  process.exit(1);
}

const only = process.argv[2];
let passed = 0;
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".test.mjs") && (!only || f.includes(only))).sort()) {
  const run = spawnSync(process.execPath, [join(dir, file)], { encoding: "utf8", env: { ...process.env, TEST_BASE: base }, timeout: 15 * 60 * 1000 });
  const out = `${run.stdout}${run.stderr}`;
  const p = (out.match(/^PASS /gm) ?? []).length;
  const f = (out.match(/^FAIL /gm) ?? []).length + (run.status !== 0 && !/^FAIL /m.test(out) ? 1 : 0);
  passed += p;
  failed += f;
  console.log(`${f ? "FAIL" : "ok  "} ${file}: ${p} passed${f ? `, ${f} failed` : ""}`);
  if (f) console.log(out.split("\n").filter((l) => /^FAIL |Error|waiting for/.test(l)).slice(0, 12).join("\n"));
}
console.log(`\nBrowser tests: ${passed} passed, ${failed} failed`);
stop();
process.exit(failed ? 1 : 0);
