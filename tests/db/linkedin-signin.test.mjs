import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
// Database rules for LinkedIn sign-in, checked in an in-memory Postgres
// (PGlite): no Docker needed. Run with `npm run test:db`.
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

let n = 0;
const uid = () => `00000000-0000-0000-0000-${String(++n).padStart(12, "0")}`;
// A LinkedIn account arrives already confirmed, carrying LinkedIn's own
// details (a name, a picture) and none of the game's.
async function linkedInSignUp(email) {
  const id = uid();
  await db.query(`insert into auth.users values ($1,$2,$3,now())`, [id, email, JSON.stringify({ name: "Sara K", iss: "https://www.linkedin.com/oauth" })]);
  return id;
}
const player = async (id) => (await q(`select * from players where id=$1`, [id]))[0];
const apply = async (id, source, ref, terms, marketing) =>
  (await q(`select public.apply_signup_details($1,$2,$3,$4,$5) r`, [id, source, ref, terms, marketing]))[0].r;

const referrer = await linkedInSignUp("referrer@corp.ae");
const code = (await player(referrer)).invite_code;

// A new player arriving through an invite link, from a LinkedIn post
const A = await linkedInSignUp("new.a@corp.ae");
let p = await player(A);
ok(p && p.source === "direct" && p.referred_by === null && p.marketing_consent === false, "a LinkedIn account gets a player record straight away, with no source or referrer yet");
const terms = new Date(Date.now() - 60_000).toISOString();
ok((await apply(A, "linkedin", code.toUpperCase(), terms, true)) === true, "details are applied to a brand-new player");
p = await player(A);
ok(p.source === "linkedin", "where they came from is recorded (linkedin)");
ok(p.referred_by === referrer, "the friend who invited them is recorded (invite code, any case)");
ok(Math.abs(new Date(p.terms_accepted_at) - new Date(terms)) < 1000, "the time they ticked the terms box is recorded");
ok(p.marketing_consent === true && p.marketing_consent_at !== null, "the marketing tick is recorded, with its date");

// It can't be used to re-attribute a player afterwards
const other = await linkedInSignUp("other@corp.ae");
ok((await apply(A, "website", (await player(other)).invite_code, null, false)) === false, "a second call changes nothing");
p = await player(A);
ok(p.source === "linkedin" && p.referred_by === referrer && p.marketing_consent === true, "source, referrer and consent are unchanged (an unticked box never withdraws consent)");

// Not a new player any more: older than 10 minutes, or has already played
const B = await linkedInSignUp("old.b@corp.ae");
await db.query(`update players set created_at = now() - interval '11 minutes' where id=$1`, [B]);
ok((await apply(B, "linkedin", code, null, false)) === false && (await player(B)).referred_by === null, "a player created more than 10 minutes ago is not touched");
const C = await linkedInSignUp("played.c@corp.ae");
await db.query(`update players set last_played_on = current_date where id=$1`, [C]);
ok((await apply(C, "linkedin", code, null, false)) === false && (await player(C)).referred_by === null, "a player who has already played is not touched");
ok((await apply(B, "", "", null, true)) === false && (await player(B)).marketing_consent === true, "a returning player who ticks the marketing box is opted in");

// Awkward input
const D = await linkedInSignUp("d@corp.ae");
ok((await apply(D, "x".repeat(200), "nonsense", "2999-01-01T00:00:00Z", false)) === true, "over-long and nonsense values are accepted without an error");
p = await player(D);
ok(p.source.length === 40 && p.referred_by === null, "source is cut to 40 characters and an unknown invite code is ignored");
ok(new Date(p.terms_accepted_at) <= new Date(Date.now() + 5000), "a terms time in the future is brought back to now");
const E = await linkedInSignUp("e@corp.ae");
await apply(E, "direct", (await player(E)).invite_code, null, false);
ok((await player(E)).referred_by === null, "a player can't be their own referrer");
ok((await apply(uid(), "linkedin", code, null, true)) === false, "an unknown player id does nothing");

// A referred LinkedIn player counts for the referrer's bonus exactly like an email one
await db.query(`insert into quiz_attempts(id,player_id,track,set_date,scored) values ($1,$2,'ct','2026-12-02',true)`, ["11111111-1111-1111-1111-111111111111", A]);
await db.query(`update quiz_attempts set completed_at=now(), score=12, total=20, time_ms=90000 where id='11111111-1111-1111-1111-111111111111'`);
const t = (await q(`select * from prize_totals('2026-12-01','2026-12-31')`)).find((r) => r.player_id === referrer);
ok(t && Number(t.referral_points) === 10, `the referrer earns 10 bonus points once the LinkedIn friend finishes a scored quiz (got ${t?.referral_points})`);

// Only the server may call it
await db.exec(`set role authenticated; set request.jwt.claim.sub = '${A}'`);
const denied = async (sql) => { try { await db.query(sql); return false; } catch (e) { return /permission denied/.test(e.message); } };
ok(await denied(`select public.apply_signup_details('${A}','x','${code}',null,true)`), "a signed-in player can't call it");
await db.exec("reset role; set role anon");
ok(await denied(`select public.apply_signup_details('${A}','x','${code}',null,true)`), "a visitor can't call it");
await db.exec("reset role");
