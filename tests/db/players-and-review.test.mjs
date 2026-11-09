import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
// Database rules, checked in an in-memory Postgres (PGlite): no Docker needed.
// Run with `npm run test:db`.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const M = join(dirname(fileURLToPath(import.meta.url)), "../../supabase/migrations") + "/";
const db = new PGlite();
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const q = async (sql, p) => (await db.query(sql, p)).rows;
const expectErr = async (sql, m) => { try { await db.exec(sql); ok(false, m + " (no error)"); } catch (e) { ok(true, `${m} -> ${e.message.split("\n")[0]}`); } };

// Minimal stand-ins for what Supabase provides.
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
`);
await db.exec(readFileSync(M + "20261019000001_players_and_review.sql", "utf8"));
ok(true, "migration runs");

const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222", C = "33333333-3333-3333-3333-333333333333";
await db.query(`insert into auth.users values ($1,'a@x.com',$2,null)`, [A, { source: "linkedin", marketing_consent: true, terms_accepted_at: "2026-10-19T10:00:00Z" }]);
ok((await q(`select * from players`)).length === 0, "unconfirmed sign-up creates no player");
await db.query(`update auth.users set email_confirmed_at = now() where id=$1`, [A]);
let [pa] = await q(`select * from players where id=$1`, [A]);
ok(pa && pa.source === "linkedin" && pa.marketing_consent === true && pa.marketing_consent_at, "confirming creates the player with source and consent");
ok(/^[A-Z][a-z]+ [A-Z][a-z]+ [1-9][0-9]$/.test(pa.anonymous_name), `anonymous name looks right: "${pa.anonymous_name}"`);
ok(pa.leaderboard_mode === "anonymous", "leaderboard defaults to anonymous");

await db.query(`insert into auth.users values ($1,'b@x.com',$2,now())`, [B, { terms_accepted_at: "garbage", referred_by: A }]);
let [pb] = await q(`select * from players where id=$1`, [B]);
ok(pb && pb.marketing_consent === false, "bad metadata still creates the player (fallback) and never blocks sign-in");
await db.query(`insert into auth.users values ($1,'c@x.com',$2,now())`, [C, { referred_by: A }]);
ok((await q(`select referred_by from players where id=$1`, [C]))[0].referred_by === A, "referred_by is linked to the inviting player");

// Names drawn from all 12 x 12 x 90 combinations
const names = await q(`select public.random_player_name() n from generate_series(1,2000)`);
const nums = names.map((r) => Number(r.n.split(" ")[2]));
ok(Math.min(...nums) >= 10 && Math.max(...nums) <= 99 && names.every((r) => !r.n.includes("null")), "random names stay in range (10-99, no gaps)");

// Act as player A
const asA = async (sql) => db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false); ${sql}; reset role;`);
await asA(`update players set display_name='Sara', role='business_owner', leaderboard_mode='name' where id='${A}'`);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.display_name === "Sara" && pa.role === "business_owner", "player can set own name and role");
await asA(`update players set display_name='Hacked' where id='${B}'`);
ok((await q(`select display_name from players where id=$1`, [B]))[0].display_name === null, "player cannot change someone else's row");
await expectErr(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false); update players set shifts_completed=99 where id='${A}'`, "player cannot change their own stats");
await db.exec("reset role");
await expectErr(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false); insert into review_attempts(id,player_id,shift) values (gen_random_uuid(),'${A}',1)`, "player cannot write attempts");
await db.exec("reset role");
await expectErr(`set role anon; select * from players`, "signed-out visitors cannot read players");
await db.exec("reset role");
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false);`);
const visible = (await db.query(`select id from players`)).rows;
await db.exec("reset role");
ok(visible.length === 1 && visible[0].id === A, "player sees only their own row");

// Consent date moves when consent changes
await db.query(`update players set marketing_consent_at='2020-01-01' where id=$1`, [A]);
await asA(`update players set marketing_consent=false where id='${A}'`);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.marketing_consent === false && new Date(pa.marketing_consent_at).getFullYear() >= 2026, "withdrawing consent stamps a new consent date");

// Completing attempts updates the summary
const att1 = "aaaaaaaa-0000-0000-0000-000000000001", att2 = "aaaaaaaa-0000-0000-0000-000000000002", att3 = "aaaaaaaa-0000-0000-0000-000000000003";
await db.query(`insert into review_attempts(id,player_id,shift) values ($1,$2,1),($3,$2,1),($4,$2,2)`, [att1, A, att2, att3]);
await db.query(`insert into review_answers(attempt_id,doc_id,correct,desk_ms) values ($1,'s1-01',true,1000)`, [att1]);
await expectErr(`insert into review_answers(attempt_id,doc_id,correct,desk_ms) values ('${att1}','s1-01',false,1000)`, "a second answer to the same document is refused");
await db.query(`update review_attempts set completed_at=now(), score=8, total=10 where id=$1`, [att1]);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.shifts_completed === 1 && pa.best_scores.shift_1 === 8 && pa.current_streak === 1 && pa.modules_played.join() === "document_review", "first completion: 1 shift, best 8, streak 1");
await db.query(`update review_attempts set completed_at=now(), score=6, total=10 where id=$1`, [att2]);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.shifts_completed === 1 && pa.best_scores.shift_1 === 8 && pa.current_streak === 1 && pa.modules_played.length === 1, "replaying lower keeps best 8, same-day streak stays 1, no duplicate module");
await db.query(`update players set last_played_on = (now() at time zone 'Asia/Dubai')::date - 1 where id=$1`, [A]);
await db.query(`update review_attempts set completed_at=now(), score=10, total=10 where id=$1`, [att3]);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.shifts_completed === 2 && pa.best_scores.shift_2 === 10 && pa.current_streak === 2, "played yesterday and today: streak 2, two shifts");
await db.query(`update players set last_played_on = (now() at time zone 'Asia/Dubai')::date - 3 where id=$1`, [A]);
await db.query(`update review_attempts set completed_at=null where id=$1`, [att3]);
await db.query(`update review_attempts set completed_at=now(), score=9 where id=$1`, [att3]);
[pa] = await q(`select * from players where id=$1`, [A]);
ok(pa.current_streak === 1 && pa.best_scores.shift_2 === 10, "a gap of days resets the streak to 1; best stays 10");
