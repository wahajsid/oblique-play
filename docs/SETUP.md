# Account setup

What exists today (found 19 Oct 2026 from past sessions, the oblique-os and passdrill repos, and public DNS):

| Service | Status |
| --- | --- |
| Supabase | Oblique OS uses project `xtzkatvxclfonjtzupli` (Singapore, **Free plan**). PassDrill has its own. **No project for the game yet.** |
| Resend | Verified for **obliqueintel.com** only. **obliqueconsult.com is not verified.** |
| HubSpot | Portal is very likely **45531451** (from obliqueconsult.com's SPF record). No private app or token found. |
| Vercel | Login `wahajs-1124`, **Hobby plan**. Deploys only build when the commit author is `wahajsid@users.noreply.github.com`. |
| DNS for obliqueconsult.com | **Hover**. Mail is Microsoft 365. The website is on Framer. |
| PostHog | Not set up. |

Do the steps in this order. Each one says which values to copy into Vercel.

## 1. Supabase: a new project for the game

The plan keeps the game separate from Oblique OS. That protects the firm's production data and keeps the two projects' sign-in settings from clashing.

1. Create a project named `oblique-play`. Pick the region closest to the UAE that Supabase offers (Mumbai is closer than Singapore).
   - Free organisations allow two active projects. If Oblique OS and PassDrill are in the same organisation, this needs the Pro plan ($25/month).
   - Pro is worth it anyway for a public launch: backups, and no pausing after 7 idle days.
2. **SQL Editor:** paste and run each file in `supabase/migrations/`, in name order:
   1. `20261019000001_players_and_review.sql`
   2. `20261020000001_daily_quiz.sql`
   3. `20261020000002_challenges.sql`
   4. `20261020000003_day9.sql`
   5. `20261024000001_prizes.sql`
   6. `20261108000001_content_reports.sql`
   7. `20261110000001_fair_play.sql`
   8. `20261110000002_leads.sql`

   Or, from a laptop with the CLI linked to the project: `npx supabase db push`.
3. **Authentication → URL configuration**
   - Site URL: `https://play.obliqueconsult.com`
   - Redirect URLs: `https://play.obliqueconsult.com/**` and `http://localhost:3000/**`
4. **Authentication → Sign in / Providers → Email**
   - Email OTP length: **6**
   - Email OTP expiry: **3600** seconds (1 hour)
5. **Authentication → Emails → Templates**
   - In both "Magic link" and "Confirm signup", paste `supabase/templates/sign-in.html`.
   - Subject for both: `Your sign-in code for the UAE tax game`
6. **Authentication → Emails → SMTP settings:** turn on custom SMTP using Resend (see step 2).
7. **Authentication → Rate limits:** raise "emails sent per hour" from the default to at least 500 for launch week.
8. **Project settings → API keys:** copy into Vercel (step 5):
   - `NEXT_PUBLIC_SUPABASE_URL`: the project URL
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the publishable key (`sb_publishable_…`)
   - `SUPABASE_SECRET_KEY`: a secret key (`sb_secret_…`). Server only; never put it in a `NEXT_PUBLIC_` variable.

## 2. Resend: verify obliqueconsult.com

1. In Resend, **Domains → Add domain → `obliqueconsult.com`**.
2. In **Hover**, add exactly the records Resend shows. Normally that's:
   - a DKIM `TXT` record at `resend._domainkey`
   - an `MX` and an SPF `TXT` record on the `send` subdomain

   These don't touch the main SPF record or Microsoft 365 mail.
3. While in Hover: the main SPF record has a stray line break between its two `include:` entries (`…outlook.com\010include:…hubspotemail.net`). Replace it with a single space. That's an existing issue, not caused by this work.
4. Create an API key with **sending access**, limited to obliqueconsult.com.
5. In Supabase SMTP settings (step 1.6):
   - Host `smtp.resend.com`, port `465`
   - Username `resend`, password: the API key
   - Sender `play@obliqueconsult.com`, name `Oblique`

Sending from obliqueconsult.com itself also avoids the problem where Microsoft 365 quarantines obliqueintel.com mail as a look-alike domain.

## 3. HubSpot: private app and properties

1. **Settings → Integrations → Private apps** (may be listed under **Development → Legacy apps**). Create **Oblique Play sync** with scopes:
   - `crm.objects.contacts.read`, `crm.objects.contacts.write`
   - `crm.schemas.contacts.read`, `crm.schemas.contacts.write`
2. Create the contact properties once, from a laptop with the repo:
   `HUBSPOT_ACCESS_TOKEN=… npm run hubspot:setup`
3. **Marketing contacts:**
   - Set contacts created by integrations as **non-marketing**.
   - Add a workflow: when *Oblique Play: marketing consent* is *Yes*, set marketing contact status to *Marketing*. Only consenting players then count towards the HubSpot bill and get marketing email.
4. **Diagnostic follow-up:** add a workflow for when *Oblique Play: flag for free diagnostic* is *Yes*, for example a task for the sales owner.

## 4. The HubSpot sync function

From a laptop with the Supabase CLI, logged in, run:

```bash
supabase functions deploy hubspot-sync --project-ref <game project ref> --no-verify-jwt
supabase secrets set --project-ref <ref> HUBSPOT_ACCESS_TOKEN=… WEBHOOK_SECRET=<a long random string>
```

Then go to **Database → Webhooks → Create**:
- Table `players`, events **Insert** and **Update**
- Type: Supabase Edge Function `hubspot-sync`, method POST
- Header `x-webhook-secret`: the same random string

## 5. Vercel and the subdomain

1. Import the GitHub repo `wahajsid/oblique-play` as a new Vercel project.
2. Add the three Supabase variables from step 1.8, plus `NEXT_PUBLIC_SITE_URL=https://play.obliqueconsult.com`. Leave `PRIZES_ENABLED` unset until the prize rules are cleared (`docs/PRIZES.md`).
3. **Domains:** add `play.obliqueconsult.com`. In Hover, add the `CNAME` record Vercel shows (usually `cname.vercel-dns.com`). The main site on Framer is unaffected.
4. **Diagnostic bookings** go to Oblique's Calendly page, `https://calendly.com/obco`. To use another Calendly event, set `DIAGNOSTIC_BOOKING_URL` in Vercel. The player's name and email are prefilled, and bookings are tagged `utm_source=oblique-play` for Calendly's reports.
5. **Plan:** Vercel's Hobby plan is for non-commercial use. A public marketing game for Oblique needs **Pro** ($20/month).

## 6. Analytics and uptime alerts

1. **PostHog** (analytics and error reports): create a project at posthog.com (the EU region is the default here). In Vercel, set `NEXT_PUBLIC_POSTHOG_KEY` to the project API key, and `NEXT_PUBLIC_POSTHOG_HOST` only if the project is not in the EU. Nothing is sent until the key is set. The events are listed at the top of `src/lib/analytics.ts`.
2. **Uptime alert:** point any uptime monitor (for example UptimeRobot or Better Stack, both have free plans) at `https://play.obliqueconsult.com/api/health`, checking every 5 minutes. It answers 200 when the game can reach its database and has a quiz for today, and 503 otherwise, so it also warns when the question schedule has run out.

## Testing everything locally

Needs Docker. `npx supabase start` runs a local copy of Supabase with the same sign-in settings as production (`supabase/config.toml`) and applies all migrations. Sign-in emails land in a local inbox at http://127.0.0.1:54324. `npx supabase status` shows the local keys for `.env.local`.

## Running it on a laptop

Copy `.env.example` to `.env.local`, fill it in, then `npm run dev`. With the Supabase variables empty, the game runs without sign-in.
