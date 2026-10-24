# Oblique Play: UAE Tax Learning Game

A free, mobile-first UAE tax learning game by Oblique, served at play.obliqueconsult.com.

## Running it

```bash
npm install
npm run dev            # http://localhost:3000, reloads as you edit
npm run check:content  # re-checks every document's arithmetic and rules
npm run build          # what Vercel runs before going live
npm run hubspot:setup  # one-off: creates the HubSpot contact properties
npm run slides -- 2026-11-03  # "spot the error" LinkedIn slides (docs/marketing/SPOT-THE-ERROR.md)
npm run prizes:close -- 2026-11  # records a month's prize winners (docs/PRIZES.md)
```

## How the code is organised

If you know Python, think of each folder as a module:

| Folder | What lives there |
| --- | --- |
| `src/app/` | The pages. Each folder is a URL: `app/review/[shift]/page.tsx` is `/review/1`, `/review/2` and so on. |
| `src/app/api/` | Small server functions the game calls, like Python functions behind a URL. `api/review/check` marks an answer. |
| `src/components/` | Reusable building blocks of the screens: the invoice, the feedback sheet, the results screen. |
| `src/lib/` | Plain logic with no screens: content loading, answer checking, saving progress. |
| `src/content/` | The game content as JSON files. Tax reviewers edit these (later via a spreadsheet export). |
| `scripts/` | Helper scripts, like the content checker. |
| `docs/` | Decisions, account setup and the content review checklist. |
| `supabase/` | Database tables and rules (`migrations/`), the sign-in email, and the HubSpot sync function. |

## Two rules the code enforces

1. **Answers never reach the browser before the player commits.** Pages receive documents with the answer and explanation removed (`toPublic` in `src/lib/review/content.ts`). The server marks each answer at `/api/review/check`.
2. **No document goes live unless its arithmetic checks out.** `npm run check:content` recalculates every line, total, VAT figure and currency conversion in whole fils. A document marked "right" must have no problems; a document marked "off" must have problems only where its answer says.

## Brand

Taken from obliqueconsult.com: navy `#141428`, aqua `#ADEBF2`, cream paper `#FAF7F1`, the Satoshi typeface and the ob/co mark.

- colours: the top of `src/app/globals.css`
- fonts: `src/app/layout.tsx` (Satoshi files in `src/app/fonts/`)
- marks: `src/components/brand/ObliqueMark.tsx`
- app icon: `src/app/icon.png`

## Sign-in and accounts

Email-code sign-in through Supabase, emails through Resend, players synced to HubSpot. Setup steps are in `docs/SETUP.md`. Without the Supabase variables the game runs without sign-in.
