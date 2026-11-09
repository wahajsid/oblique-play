import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
// "Continue with LinkedIn". Run with `npm run test:e2e` (see tests/README.md).
//
// LinkedIn itself can't be reached from a test, so this checks everything on
// the game's side of it:
//   1. the button sends the player to LinkedIn with the right request, and
//   2. the page LinkedIn sends them back to (/auth/callback) signs them in
//      and records their details. For that half, the local sign-in service
//      issues the same kind of one-time code it would after LinkedIn approves.
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SHOTS = join(ROOT, "tests/e2e/.shots");
mkdirSync(SHOTS, { recursive: true });
const DB_URL = process.env.TEST_DB_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const base = process.env.TEST_BASE ?? "http://localhost:3005";
const MAIL = process.env.TEST_MAIL ?? "http://127.0.0.1:54324";
const AUTH = process.env.TEST_AUTH ?? "http://127.0.0.1:54321/auth/v1";
const ok = (c, m) => { console.log(`${c ? "PASS" : "FAIL"} ${m}`); if (!c) process.exitCode = 1; };
const sql = (q) => execSync(`psql ${DB_URL} -Atc ${JSON.stringify(q)}`).toString().trim();
async function mail(to) {
  for (let i = 0; i < 30; i++) {
    const list = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json();
    if (list.messages?.length) return (await (await fetch(`${MAIL}/api/v1/message/${list.messages[0].ID}`)).json()).HTML;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email arrived for ${to}`);
}

const b = await chromium.launch();
const errors = [];
const phone = { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true };
async function context() {
  const ctx = await b.newContext(phone);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${new URL(p.url()).pathname}: ${e.message.slice(0, 60)}`));
  return { ctx, p };
}

// Someone who already plays, whose invite link the new player follows
const R = await context();
const refEmail = `li.ref.${Date.now()}@example.com`;
await R.p.goto(`${base}/signin?next=/quiz`);
await R.p.getByLabel("Email address").fill(refEmail);
await R.p.getByRole("checkbox").nth(0).check();
await R.p.getByRole("button", { name: "Email me a code" }).click();
await R.p.getByText("Check your email").first().waitFor({ timeout: 15000 });
await R.p.getByLabel("Sign-in code").fill((await mail(refEmail)).match(/letter-spacing:8px;color:#141428;">(\d{6})</)[1]);
await R.p.getByRole("button", { name: "Sign in" }).click();
await R.p.waitForURL(/\/quiz$/, { timeout: 15000 });
const [refId, invite] = sql(`select id||'|'||invite_code from players where email='${refEmail}'`).split("|");

// 1. The button
const N = await context();
await N.p.goto(`${base}/signin?next=/quiz&src=linkedin-post&ref=${invite}`);
const button = N.p.getByTestId("linkedin-signin");
ok(await button.isVisible() && (await button.innerText()).trim() === "Continue with LinkedIn", "the sign-in page offers \"Continue with LinkedIn\" under the email option");
ok(await N.p.getByRole("button", { name: "Email me a code" }).isVisible(), "email sign-in is still there");
const box = await button.boundingBox();
ok(box.height >= 44, `the button is big enough to tap (${Math.round(box.height)}px tall)`);
await N.p.screenshot({ path: join(SHOTS, "linkedin-signin.png"), fullPage: true });

await button.click();
await N.p.locator("#signin-error").waitFor();
ok(/agree to the terms/.test(await N.p.locator("#signin-error").innerText()) && new URL(N.p.url()).pathname === "/signin", "without the terms box ticked it asks for it and goes nowhere");

await N.p.getByRole("checkbox").nth(0).check();
await N.p.getByRole("checkbox").nth(1).check();
// Stand in for the hop to LinkedIn, so the test never leaves this machine.
// Only for this one step: while a stand-in is active the browser's cache is
// off, which makes React report harmless errors on later page loads.
const hopOut = `${AUTH}/authorize**`;
await N.p.route(hopOut, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<h1>LinkedIn stand-in</h1>" }));
await button.click();
await N.p.waitForURL(/\/auth\/v1\/authorize/, { timeout: 15000 });
const go = new URL(N.p.url());
ok(go.searchParams.get("provider") === "linkedin_oidc", "the player is handed to the sign-in service for LinkedIn (provider=linkedin_oidc)");
ok(go.searchParams.get("redirect_to") === `${base}/auth/callback?next=%2Fquiz`, `afterwards they come back to the game's return page, then on to the quiz (${go.searchParams.get("redirect_to")})`);
ok((go.searchParams.get("code_challenge") ?? "").length >= 43 && go.searchParams.get("code_challenge_method") === "s256", "the request is protected with a one-time challenge");
// The real hop to linkedin.com, when this machine can reach it. Not counted
// as a pass or fail: it depends on the network, not on the game.
const hop = await fetch(go.href, { redirect: "manual" }).catch(() => null);
const li = hop?.headers.get("location") ? new URL(hop.headers.get("location")) : null;
if (li?.hostname === "www.linkedin.com") console.log(`NOTE  LinkedIn is asked for: ${li.searchParams.get("scope")} (client ${li.searchParams.get("client_id")})`);
else console.log("NOTE  linkedin.com not reachable from the local sign-in service here, so the hop itself wasn't followed");
await N.p.unroute(hopOut);
const cookies = await N.ctx.cookies(`${base}/auth/callback`);
const signup = cookies.find((c) => c.name === "ob_signup");
ok(signup && signup.httpOnly && signup.path === "/auth" && signup.expires - Date.now() / 1000 <= 601, "the new player's details wait in a 10-minute cookie that page scripts can't read");
const kept = JSON.parse(decodeURIComponent(signup.value));
ok(kept.s === "linkedin-post" && kept.r === invite && kept.m === true && !Number.isNaN(Date.parse(kept.t)), "it holds the source, the invite code, the marketing tick and the time the terms were accepted");

// 2. Coming back. The app made a one-time secret ("code verifier") when the
// button was pressed; a sign-in only completes for the browser that holds it.
const verifierCookie = cookies.find((c) => c.name.endsWith("-code-verifier"));
const rawVerifier = decodeURIComponent(verifierCookie?.value ?? '""');
const verifier = JSON.parse(rawVerifier.startsWith("base64-") ? Buffer.from(rawVerifier.slice(7), "base64url").toString() : rawVerifier);
const challenge = createHash("sha256").update(verifier).digest("base64url");
ok(!!verifierCookie && verifierCookie.httpOnly !== undefined && challenge === go.searchParams.get("code_challenge"), "the browser holds the matching one-time secret, so only this browser can finish the sign-in");
// The local project's public key, the same one the app uses.
const key = process.env.TEST_SUPABASE_KEY ?? execSync("grep NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY .env.local", { cwd: ROOT }).toString().split("=")[1].trim().replace(/"/g, "");
const email = `li.new.${Date.now()}@example.com`;
let r = await fetch(`${AUTH}/otp`, { method: "POST", headers: { apikey: key, "Content-Type": "application/json" }, body: JSON.stringify({ email, create_user: true, code_challenge: challenge, code_challenge_method: "s256" }) });
if (!r.ok) throw new Error(`could not start the stand-in sign-in: ${r.status} ${await r.text()}`);
const hash = (await mail(email)).match(/token_hash=([^&"]+)/)[1];
// LinkedIn passes the player's name along; give the stand-in account one too.
sql(`update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name":"Sara   Khan"}'::jsonb where email='${email}'`);
const backTo = `${base}/auth/callback?next=/quiz`;
let landed = "";
for (const type of ["signup", "magiclink"]) {
  await N.p.goto(`${AUTH}/verify?token=${hash}&type=${type}&redirect_to=${encodeURIComponent(backTo)}`, { waitUntil: "load" }).catch(() => {});
  await N.p.waitForTimeout(1500);
  landed = N.p.url();
  if (new URL(landed).pathname === "/quiz") break;
}
ok(new URL(landed).origin === base && new URL(landed).pathname === "/quiz", `coming back with a valid code signs the player in and takes them to the quiz (${landed})`);
ok(await N.p.getByRole("link", { name: /Corporate Tax/ }).first().isVisible(), "the quiz picker shows, signed in");
const row = sql(`select source||'|'||coalesce(referred_by::text,'')||'|'||marketing_consent||'|'||(abs(extract(epoch from terms_accepted_at - '${kept.t}'::timestamptz)) < 1) from players where email='${email}'`);
ok(row === `linkedin-post|${refId}|true|true`, `the new player's record has the source, the friend who invited them, the marketing tick and the terms time (${row})`);
ok(!(await N.ctx.cookies(`${base}/auth/callback`)).some((c) => c.name === "ob_signup"), "the details cookie is cleared once used");
await N.p.goto(`${base}/profile`, { waitUntil: "networkidle" });
ok((await N.p.getByLabel("Display name").inputValue()) === "Sara Khan" && sql(`select coalesce(display_name,'(none)') from players where email='${email}'`) === "(none)", "the name field is pre-filled from LinkedIn (Sara Khan), and nothing is saved or shown until the player saves it");
await N.p.goto(`${base}/signin`, { waitUntil: "networkidle" });
ok(new URL(N.p.url()).pathname === "/", "a signed-in player who opens the sign-in page is sent on to the game");

// When it doesn't work, the player lands back on sign-in with a plain message
const F = await context();
for (const [path, what] of [
  ["/auth/callback?next=/quiz", "no code at all"],
  ["/auth/callback?code=not-a-real-code&next=/quiz", "a made-up code"],
  ["/auth/callback?error=access_denied&error_description=user+cancelled&next=/quiz", "the player pressing Cancel on LinkedIn"],
]) {
  await F.p.goto(`${base}${path}`, { waitUntil: "networkidle" });
  const u = new URL(F.p.url());
  const msg = await F.p.locator("#signin-error").innerText().catch(() => "");
  ok(u.pathname === "/signin" && u.searchParams.get("next") === "/quiz" && /LinkedIn sign-in didn't finish/.test(msg), `${what}: back to sign-in with "${msg.trim()}"`);
}
await F.p.goto(`${base}/auth/callback?code=x&next=https://evil.example/`, { waitUntil: "networkidle" });
ok(new URL(F.p.url()).origin === base, "a crafted link can't use the return page to bounce players to another website");
await F.p.goto(`${base}/signin?error=linkedin`, { waitUntil: "networkidle" });
await F.p.getByLabel("Email address").fill("someone@example.com");
ok(await F.p.getByRole("button", { name: "Email me a code" }).isVisible(), "after a failed LinkedIn attempt, email sign-in is right there");

ok(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(" | ")}` : ""}`);
await b.close();
