# The test copy (Railway + Supabase)

A temporary, private copy of the game for testing on real phones before launch.

| | |
| --- | --- |
| Address | https://web-production-ba5a5.up.railway.app |
| Railway project | `oblique-play-test` (service `web`) in Wahaj's Railway workspace |
| Supabase project | `oblique-play-test` (ref `zismolqoheogsawkjghh`, Mumbai) in the Oblique Consult organisation. Separate from every other project; delete it when testing is done. |

## How it differs from the live game

Set in Railway, under the `web` service, then **Variables**:

| Variable | Value | Why |
| --- | --- | --- |
| `PREVIEW_TODAY` | `2026-12-01` | The game behaves as if today is launch day, so the 1 Dec quiz and document can be played now. Change it to `2026-12-02` and so on to try later days. Remove it to use the real date. |
| `PRIZES_ENABLED` | `true` | Shows the prizes (December counts as a prize month because of the pinned date). |
| `NOINDEX` | `true` | Tells search engines not to list the test copy. |
| `NEXT_PUBLIC_SITE_URL` | the Railway address | Sign-in links, share links and link previews use this address. |
| Supabase URL and keys | the test project's | Never the live project's. |

Changing a variable redeploys the service (about 4 minutes).

## Sign-in emails

The test project uses Supabase's built-in email, which **only sends to people on the Supabase organisation's team** and only a few emails an hour. To let other testers sign in, set up custom SMTP (2 minutes):

1. Supabase dashboard, project **oblique-play-test**, then **Authentication**, **Emails**, **SMTP Settings**: turn on custom SMTP.
2. Host `smtp.resend.com`, port `465`, username `resend`, password: a Resend API key.
3. Sender: an address on a domain verified in Resend (today that's obliqueintel.com, e.g. `play-test@obliqueintel.com`), name `Oblique`.
4. **Authentication**, **Rate limits**: raise emails per hour (e.g. 100).

## Updating it with new code

The Railway service is connected to the GitHub repo `wahajsid/oblique-play`, branch `main`: **every push to `main` redeploys the test copy** (about 3 minutes). Check progress in Railway, project `oblique-play-test`, service `web`, **Deployments**.

When the live site is set up on Vercel from the same repo, one push will update both. If a build fails with a download error (for example a 504 fetching a build tool), it's on Railway's side: press **Redeploy** on that deployment.

## When testing is done

1. Railway: project `oblique-play-test`, **Settings**, **Danger**, **Delete project**.
2. Supabase: project `oblique-play-test`, **Project Settings**, **General**, **Delete project**. (It costs about USD 10 a month on the Pro plan while it exists.)
3. Revoke the Railway and Supabase access tokens made for this (railway.com/account/tokens and supabase.com/dashboard/account/tokens).
