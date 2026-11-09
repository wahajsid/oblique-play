import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
// Database rules, checked in an in-memory Postgres (PGlite): no Docker needed.
// Run with `npm run test:db`.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const M = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations") + "/";
const db = new PGlite();
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql, p) => (await db.query(sql, p)).rows;
await db.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;`);
for (const f of readdirSync(M).sort()) await db.exec(readFileSync(M + f, "utf8"));
ok(true, "all migrations run in order");

let n = 0;
const uid = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;
async function signUp(email, meta = {}) {
  const id = uid();
  await db.query(`insert into auth.users values ($1,$2,$3,now())`, [id, email, JSON.stringify(meta)]);
  return id;
}
async function round(player, track, date, score, { scored = true, done = true, ms = 60000 } = {}) {
  const id = crypto.randomUUID();
  await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,$3,$4,$5)`, [id, player, track, date, scored]);
  if (done) await db.query(`update quiz_attempts set completed_at=now(), score=$2, total=20, time_ms=$3 where id=$1`, [id, score, ms]);
}
const player = async (id) => (await q(`select * from players where id=$1`, [id]))[0];
const totals = async (from, to) => Object.fromEntries((await q(`select * from prize_totals($1,$2)`, [from, to])).map((r) => [r.player_id, r]));

// Invite codes
const A = await signUp("sara.k@gmail.com");
const pa = await player(A);
ok(/^[a-z2-9]{8}$/.test(pa.invite_code), `new player gets an 8-character invite code (${pa.invite_code})`);
const codes = new Set();
for (let i = 0; i < 300; i++) codes.add((await q(`select public.new_invite_code() c`))[0].c);
ok(codes.size === 300, "300 generated codes are all different");

// Referral links: by invite code (any case), by player id, and nonsense.
const F1 = await signUp("f1@corp.ae", { referred_by: pa.invite_code.toUpperCase() });
const F2 = await signUp("f2@corp.ae", { referred_by: A });
const F3 = await signUp("f3@corp.ae", { referred_by: "nonsense" });
ok((await player(F1)).referred_by === A, "sign-up through an invite code (any case) records the referrer");
ok((await player(F2)).referred_by === A, "sign-up through a challenge link (player id) still records the referrer");
ok((await player(F3)) && (await player(F3)).referred_by === null, "an unknown code is ignored and sign-up still works");

// Quiz points: CT + VAT scored rounds in the month only.
const NOV = "2026-11-01", NOV_END = "2026-11-30";
await round(A, "ct", "2026-11-03", 17);
await round(A, "vat", "2026-11-03", 15);
await round(A, "both", "2026-11-03", 19);                       // doesn't count
await round(A, "ct", "2026-11-04", 20, { scored: false });       // practice
await round(A, "ct", "2026-11-05", 18, { done: false });          // unfinished
await round(A, "ct", "2026-10-31", 20);                          // October
let t = await totals(NOV, NOV_END);
ok(Number(t[A].quiz_points) === 32 && Number(t[A].rounds) === 2, `quiz points = 17 + 15 = 32 from 2 rounds (got ${t[A].quiz_points}, ${t[A].rounds})`);

// Referrals: F1 finishes a scored round in November, F2 only practises.
await round(F1, "both", "2026-11-06", 10);
await round(F2, "ct", "2026-11-06", 10, { scored: false });
t = await totals(NOV, NOV_END);
ok(Number(t[A].referrals) === 1 && Number(t[A].referral_points) === 10, "a friend counts once they finish a scored quiz (any track); practice doesn't count");
ok(Number(t[A].points) === 42, `points = 32 + 10 = 42 (got ${t[A].points})`);
ok(!t[F1], "the friend's 'Both' round gives them no prize points");

// Aliases of the referrer's own mailbox don't count; a second account for the same mailbox doesn't count.
const self1 = await signUp("sarak+2@gmail.com", { referred_by: pa.invite_code });
const self2 = await signUp("Sara.K@googlemail.com", { referred_by: pa.invite_code });
const dupA = await signUp("f4@corp.ae", { referred_by: pa.invite_code });
const dupB = await signUp("F4+x@corp.ae", { referred_by: pa.invite_code });
for (const id of [self1, self2, dupA, dupB]) await round(id, "ct", "2026-11-07", 5);
t = await totals(NOV, NOV_END);
ok(Number(t[A].referrals) === 2, `own-mailbox aliases ignored, second account for f4 ignored: 2 referrals (got ${t[A].referrals})`);

// A friend whose first scored round was in October counts for October, not November.
const old = await signUp("old@corp.ae", { referred_by: pa.invite_code });
await round(old, "ct", "2026-10-20", 9);
await round(old, "ct", "2026-11-08", 9);
t = await totals(NOV, NOV_END);
const oct = await totals("2026-10-01", "2026-10-31");
ok(Number(t[A].referrals) === 2 && Number(oct[A].referrals) === 1, "a referral counts in the month of the friend's first scored round");

// Cap: 12 more friends in November -> 14 referrals, 100 points.
for (let i = 0; i < 12; i++) {
  const f = await signUp(`cap${i}@firm${i}.com`, { referred_by: pa.invite_code });
  await round(f, "vat", "2026-11-10", 1);
}
t = await totals(NOV, NOV_END);
ok(Number(t[A].referrals) === 14 && Number(t[A].referral_points) === 100 && Number(t[A].points) === 132,
  `14 referrals are capped at 100 points; total 32 + 100 = 132 (got ${t[A].referrals}, ${t[A].referral_points}, ${t[A].points})`);

// Prize board: entered, not excluded, at least one scored round.
const B = await signUp("b@corp.ae"), C = await signUp("c@corp.ae"), D = await signUp("d@corp.ae"), S = await signUp("staff@obliqueconsult.com"), R = await signUp("r@corp.ae");
await round(B, "ct", "2026-11-03", 20, { ms: 50000 }); await round(B, "vat", "2026-11-03", 20, { ms: 50000 });   // 40
await round(C, "ct", "2026-11-03", 20, { ms: 40000 }); await round(C, "vat", "2026-11-03", 20, { ms: 70000 });   // 40, slower
await round(D, "ct", "2026-11-03", 3);
await round(S, "ct", "2026-11-03", 20); await round(S, "vat", "2026-11-03", 20);
const R2 = await signUp("r2@corp.ae", { referred_by: R }); await round(R2, "ct", "2026-11-04", 1);  // R: referral points but no rounds
await db.query(`update players set prize_entered_at = now() where id = any($1)`, [[A, B, C, S, R]]);
ok((await player(S)).prize_excluded === true && (await player(B)).prize_excluded === false, "an @obliqueconsult.com sign-up is excluded automatically; others are not");
await db.query(`update players set display_name='Sara', leaderboard_mode='name' where id=$1`, [A]);
const board = await q(`select * from prize_board($1, 10, $2)`, [NOV, D]);
ok(board.map((r) => r.name).join() === `Sara,${(await player(B)).anonymous_name},${(await player(C)).anonymous_name}`,
  "order: Sara 132, then B and C on 40 each; B first on time (100s vs 110s)");
ok(board.map((r) => Number(r.rank)).join() === "1,2,3", "ranks 1, 2, 3");
ok(!board.some((r) => r.player_id === S), "an excluded (staff) player never appears");
ok(!board.some((r) => r.player_id === D), "a player who hasn't entered isn't on the prize board, even when asking");
ok(!board.some((r) => r.player_id === R), "a player with referral points but no scored round this month isn't on the board");
ok(board[0].name === "Sara" && board[0].email === "sara.k@gmail.com", "shows the chosen name; email comes back for the admin script");
const meRow = await q(`select * from prize_board($1, 1, $2)`, [NOV, C]);
ok(meRow.length === 2 && meRow[1].is_me && Number(meRow[1].rank) === 3, "with limit 1, the asking player's own row (rank 3) is added");

// Awards table
await db.query(`insert into prize_awards(month,place,player_id,email,board_name,points,prize) values ($1,1,$2,'a','Sara',132,'iPhone or Galaxy S26')`, [NOV, A]);
let dup = false;
try { await db.query(`insert into prize_awards(month,place,player_id,email,board_name,points,prize) values ($1,1,$2,'b','B',40,'iPhone or Galaxy S26')`, [NOV, B]); } catch (e) { dup = e.code === "23505"; }
ok(dup, "only one live winner per place");
await db.query(`update prize_awards set status='forfeited' where player_id=$1`, [A]);
await db.query(`insert into prize_awards(month,place,player_id,email,board_name,points,prize) values ($1,1,$2,'b','B',40,'iPhone or Galaxy S26')`, [NOV, B]);
ok(true, "after a forfeit, the place can go to someone else (the forfeited row stays)");
await db.query(`update prize_awards set status='delivered' where player_id=$1`, [B]);
ok((await q(`select delivered_at from prize_awards where player_id=$1`, [B]))[0].delivered_at !== null, "marking delivered stamps the delivery date");
let oldStatus = false;
try { await db.query(`update prize_awards set status='paid' where player_id=$1`, [B]); } catch { oldStatus = true; }
ok(oldStatus, "the old cash status 'paid' is no longer accepted");
let noPrize = false;
try { await db.query(`insert into prize_awards(month,place,player_id,email,board_name,points) values ('2026-12-01',3,$1,'c','C',40)`, [C]); } catch { noPrize = true; }
ok(noPrize, "every award must say what the prize is");
let badMonth = false;
try { await db.query(`insert into prize_awards(month,place,player_id,email,board_name,points,prize) values ('2026-11-02',2,$1,'c','C',40,'AirPods')`, [C]); } catch { badMonth = true; }
ok(badMonth, "month must be the first day of a month");

// Security: players can't enter themselves with a backdated stamp, un-exclude themselves, see awards or call the board.
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${S}',false);`);
const denied = async (sql) => { try { await db.query(sql); return false; } catch (e) { return /permission denied/.test(e.message); } };
ok(await denied(`update players set prize_excluded=false where id='${S}'`), "a player can't clear their own exclusion");
ok(await denied(`update players set prize_entered_at='2026-01-01' where id='${S}'`), "a player can't set their own entry date");
ok(await denied(`update players set invite_code='aaaaaaaa' where id='${S}'`), "a player can't change their invite code");
ok(await denied(`select * from prize_awards`), "players can't read the awards table");
ok(await denied(`select * from prize_board('${NOV}', 10, null)`), "players can't call the prize board directly");
ok(await denied(`select * from prize_totals('${NOV}', '${NOV_END}')`), "players can't call the points function directly");
const own = await q(`select invite_code from players`);
ok(own.length === 1, "a player can still read their own row (including their invite code)");
await db.exec("reset role");
