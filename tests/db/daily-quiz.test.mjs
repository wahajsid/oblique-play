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
await db.exec(`
  create role anon nologin; create role authenticated nologin; create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated; grant execute on function auth.uid() to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;`);
await db.exec(readFileSync(M + "20261019000001_players_and_review.sql", "utf8"));
await db.exec(readFileSync(M + "20261020000001_daily_quiz.sql", "utf8"));
ok(true, "both migrations run in order");
const A = "11111111-1111-1111-1111-111111111111", B = "22222222-2222-2222-2222-222222222222";
await db.query(`insert into auth.users values ($1,'a@x.com','{}',now()),($2,'b@x.com','{}',now())`, [A, B]);
const today = (await q(`select (now() at time zone 'Asia/Dubai')::date::text d`))[0].d;

const a1 = "aaaaaaaa-0000-0000-0000-000000000001", a2 = "aaaaaaaa-0000-0000-0000-000000000002", a3 = "aaaaaaaa-0000-0000-0000-000000000003";
await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,'ct',$3,true)`, [a1, A, today]);
let dup = false;
try { await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,'ct',$3,true)`, [a2, A, today]); } catch (e) { dup = e.code === "23505"; }
ok(dup, "a second scored attempt for the same track and day is refused (23505)");
await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,'ct',$3,false)`, [a2, A, today]);
ok(true, "a practice attempt for the same day is allowed");
await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,'vat',$3,true)`, [a3, A, today]);
ok(true, "a scored attempt on a different track the same day is allowed");
await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values (gen_random_uuid(),$1,'ct',$2,true)`, [B, today]);
ok(true, "another player can have their own scored attempt");

// practice completion: modules/tracks updated, streak not touched
await db.query(`update quiz_attempts set completed_at=now(), score=12, total=20 where id=$1`, [a2]);
let [p] = await q(`select * from players where id=$1`, [A]);
ok(p.modules_played.includes("daily_quiz") && p.quiz_tracks_played.join() === "ct" && p.current_streak === 0, "finishing practice notes the module and track but doesn't count for the streak");
await db.query(`update quiz_attempts set completed_at=now(), score=17, total=20 where id=$1`, [a1]);
[p] = await q(`select * from players where id=$1`, [A]);
ok(p.current_streak === 1 && p.quiz_tracks_played.length === 1, "finishing the scored round starts the streak; track not duplicated");
await db.query(`update quiz_attempts set completed_at=now(), score=15, total=20 where id=$1`, [a3]);
[p] = await q(`select * from players where id=$1`, [A]);
ok(p.current_streak === 1 && p.quiz_tracks_played.join() === "ct,vat", "second track the same day: streak stays 1, tracks ct,vat");

// review shift still works with the shared streak function
await db.query(`update players set last_played_on = $2::date - 1, current_streak = 4 where id=$1`, [A, today]);
const r1 = "bbbbbbbb-0000-0000-0000-000000000001";
await db.query(`insert into review_attempts(id,player_id,shift) values ($1,$2,1)`, [r1, A]);
await db.query(`update review_attempts set completed_at=now(), score=9, total=10 where id=$1`, [r1]);
[p] = await q(`select * from players where id=$1`, [A]);
ok(p.current_streak === 5 && p.best_scores.shift_1 === 9 && p.shifts_completed === 1, "a shift the day after continues the streak (4 to 5), best score 9");

// RLS
await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${A}',false);`);
const mine = (await db.query(`select id from quiz_attempts`)).rows.length;
let denied = false;
try { await db.query(`insert into quiz_answers(attempt_id,question_id,correct,time_ms) values ($1,'ct-x',true,1)`, [a1]); } catch (e) { denied = /permission denied/.test(e.message); }
await db.exec("reset role");
ok(mine === 3, `player sees only their own 3 attempts (saw ${mine})`);
ok(denied, "player cannot write quiz answers");
