// Picks a month's prize winners and records them in prize_awards.
//
// Run on the 1st of the next month (or later):
//   npm run prizes:close -- 2026-11            record the winners
//   npm run prizes:close -- 2026-11 --preview  just show the standings
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY, from the
// environment or .env.local.
//
// Safe to run again: after a winner is marked "forfeited" in the table
// editor, running it again moves the places up to the next eligible players.
// It never changes a winner already marked "verified" or "delivered".
// Only the campaign months in src/content/prizes.json have prizes.
// See docs/PRIZES.md.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
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
const { months, gifts } = JSON.parse(readFileSync(join(root, "src/content/prizes.json"), "utf8"));

const [arg, flag] = process.argv.slice(2);
if (!/^\d{4}-\d{2}$/.test(arg ?? "")) {
  console.error("Usage: npm run prizes:close -- YYYY-MM [--preview]");
  process.exit(1);
}
const preview = flag === "--preview";
const month = `${arg}-01`;
if (!months.includes(month)) {
  console.error(`${arg} isn't a prize month. Prize months: ${months.map((m) => m.slice(0, 7)).join(", ")}.`);
  process.exit(1);
}
const end = new Date(`${month}T00:00:00Z`);
end.setUTCMonth(end.getUTCMonth() + 1, 0);
const lastDay = end.toISOString().slice(0, 10);
const uaeToday = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10);
if (!preview && uaeToday <= lastDay) {
  console.error(`${arg} isn't over yet (it ends ${lastDay}, UAE time). Use --preview to see the standings so far.`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or put them in .env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const fail = (what, error) => {
  console.error(`${what}: ${error.message}`);
  process.exit(1);
};

const { data: board, error: boardError } = await db.rpc("prize_board", { p_month: month, p_limit: 20, p_me: null });
if (boardError) fail("Couldn't read the standings", boardError);
const { data: awards, error: awardsError } = await db.from("prize_awards").select("*").eq("month", month);
if (awardsError) fail("Couldn't read prize_awards", awardsError);

const forfeited = new Set(awards.filter((a) => a.status === "forfeited").map((a) => a.player_id));
const candidates = board.filter((r) => !forfeited.has(r.player_id));
// Rounds worth a second look before a gift goes out: 18+ out of 20 in under
// 80 seconds is 4 seconds a question, including reading it.
const { data: rounds } = await db
  .from("quiz_attempts")
  .select("player_id, score, time_ms")
  .eq("scored", true)
  .not("completed_at", "is", null)
  .gte("set_date", month)
  .lte("set_date", lastDay)
  .in("player_id", candidates.slice(0, 10).map((r) => r.player_id));
const fastRounds = (id) => (rounds ?? []).filter((r) => r.player_id === id && r.score >= 18 && r.time_ms < 80_000).length;
const sameScore = (a, b) => a && b && a.points === b.points && a.quiz_points === b.quiz_points && a.time_ms === b.time_ms;

console.log(`\nStandings for ${arg} (entered, eligible players${forfeited.size ? `; ${forfeited.size} forfeited left out` : ""}):\n`);
console.table(
  candidates.slice(0, 10).map((r, i) => ({
    place: i + 1,
    name: r.name,
    email: r.email,
    points: Number(r.points),
    quiz: Number(r.quiz_points),
    friends: Number(r.referral_points),
    "time (min)": Math.round(Number(r.time_ms) / 600) / 100,
    "very fast rounds": fastRounds(r.player_id),
  })),
);
if (candidates.slice(0, 3).some((r) => fastRounds(r.player_id) > 0)) {
  console.log('"Very fast rounds" are scores of 18+ in under 80 seconds. Ask those winners for the live check in the prize rules before sending a gift.');
}
if (preview) process.exit(0);

// A complete tie (points, quiz points and time) across a prize place is
// rare; the rules say those prizes are shared, so it needs a person.
const ties = [0, 1, 2].filter((i) => sameScore(candidates[i], candidates[i + 1]));
if (ties.length) {
  console.error(`Exact tie between places ${ties.map((i) => `${i + 1} and ${i + 2}`).join(", ")}. Nothing recorded.`);
  console.error("The rules say each exactly tied player gets the prize for the higher place. Record these winners by hand.");
  process.exit(1);
}

const target = candidates.slice(0, 3).map((r, i) => ({ place: i + 1, row: r }));
const live = awards.filter((a) => a.status !== "forfeited");
const toRemove = [];
for (const a of live) {
  const t = target.find((x) => x.row.player_id === a.player_id);
  if (t && t.place === a.place) continue;
  if (a.status !== "contacting") {
    console.error(`${a.board_name} is already "${a.status}" for place ${a.place}, but the standings now put them elsewhere. Nothing changed; sort this out by hand.`);
    process.exit(1);
  }
  toRemove.push(a.id);
}
if (toRemove.length) {
  const { error } = await db.from("prize_awards").delete().in("id", toRemove);
  if (error) fail("Couldn't update prize_awards", error);
}
const kept = new Set(live.filter((a) => !toRemove.includes(a.id)).map((a) => a.player_id));
const rows = target
  .filter((t) => !kept.has(t.row.player_id))
  .map((t) => ({
    month,
    place: t.place,
    player_id: t.row.player_id,
    email: t.row.email,
    board_name: t.row.name,
    points: Number(t.row.points),
    prize: gifts[t.place - 1],
  }));
if (rows.length) {
  const { error } = await db.from("prize_awards").insert(rows);
  if (error) fail("Couldn't record the winners", error);
}

const { data: final } = await db.from("prize_awards").select("place, board_name, email, points, prize, status").eq("month", month).neq("status", "forfeited").order("place");
console.log(`\nWinners for ${arg}:\n`);
console.table(final.map((w) => ({ place: w.place, name: w.board_name, email: w.email, points: w.points, prize: w.prize, status: w.status })));
if (target.length < 3) console.log(`Only ${target.length} eligible player(s), so only ${target.length} prize(s) this month.`);
console.log("\nNext: email each winner using the template in docs/PRIZES.md, then update their row in prize_awards.");
