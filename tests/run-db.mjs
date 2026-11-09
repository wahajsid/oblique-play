// Runs every database test in tests/db. `npm run test:db`
import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "db");
let passed = 0;
let failed = 0;
for (const file of readdirSync(dir).filter((f) => f.endsWith(".test.mjs")).sort()) {
  const run = spawnSync(process.execPath, [join(dir, file)], { encoding: "utf8" });
  const out = `${run.stdout}${run.stderr}`;
  const p = (out.match(/^PASS /gm) ?? []).length;
  const f = (out.match(/^FAIL /gm) ?? []).length + (run.status !== 0 && !/^FAIL /m.test(out) ? 1 : 0);
  passed += p;
  failed += f;
  console.log(`${f ? "FAIL" : "ok  "} ${file}: ${p} passed${f ? `, ${f} failed` : ""}`);
  if (f) console.log(out.split("\n").filter((l) => /^FAIL |Error/.test(l)).slice(0, 10).join("\n"));
}
console.log(`\nDatabase tests: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
