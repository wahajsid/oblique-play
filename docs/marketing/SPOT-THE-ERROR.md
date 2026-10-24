# "Spot the error" LinkedIn posts

One command turns any document from the game into a ready-to-post LinkedIn carousel.

```bash
npm run slides -- 2026-11-03    # that day's daily document
npm run slides -- s1-03         # any document by id
```

First time on a laptop, run `npm install` and then `npx playwright install chromium` once. Each run takes about 20 seconds.

## What you get, in `slides/<date or id>/`

| File | Use |
| --- | --- |
| `spot-the-error-<date>.pdf` | Upload to LinkedIn as a **document** (Add a document, then give it the title "Spot the error"). LinkedIn shows it as swipeable slides. |
| `slide-1.png` … `slide-6.png` | The same slides as 1080×1350 images, for Instagram, WhatsApp or a LinkedIn image post. |
| `caption.txt` | The post text, and the answer to paste as the first comment. |

## The six slides

1. **Hook:** "Would you approve this tax invoice? Or is something off?", with the whole document as a preview. The same words work whether the document is right or wrong, so the hook never gives the answer away.
2. **The document, top half:** title, supplier, customer, invoice details. Large enough to read on a phone.
3. **The document, bottom half:** items and totals, ending with "Made your call?"
4. **The answer:** what's off, highlighted on the document. Or a large "Looks right" stamp when nothing is wrong.
5. **Why:** what the rule is, why it matters here, and the article of the law.
6. **Play:** "A new document every day", play.obliqueconsult.com.

## Rules

- **Only post approved documents.** Until a reviewer approves a document, every slide is stamped "DRAFT · NOT YET REVIEWED" and the command prints a warning.
- **Post a daily document on its day or later**, never before, so nobody sees the answer before playing. The slides are made on a laptop; the live site never shows them (`/slides` is switched off there).
- Suggested rhythm (from the launch plan): Thursdays, with the answer in the first comment the next day.
