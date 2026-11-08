# Reports: "Report a problem with this answer"

Under every explanation (daily quiz, document shifts, the daily document and the public puzzle page) players can tap **Report a problem with this answer**, pick a reason and add a note:

- The answer is wrong
- The law or reference is out of date
- It's unclear, or there's a typo
- Something else (a note is required)

Signed-out visitors can leave an email for a reply. Signed-in players aren't asked, because the report is linked to their account.

## Reading reports (weekly, or after a busy day)

```bash
npm run reports            # open reports, most-reported item first
npm run reports -- all     # include closed ones
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (from the environment or `.env.local`). Each item shows its file, who approved it, our answer and its reference, then each report with its reason, note, and who sent it (player, visitor, or the visitor's email). An item with 3 or more "answer is wrong" reports is flagged.

## Dealing with a report

1. The reviewer for that track checks it: Ashta or Pranay for Corporate Tax; Aidarous or Arslan for VAT and documents.
2. If the item is wrong or out of date, fix it in its JSON file (the file is shown in the report), or put it on hold by adding `"hold": "Reported: <reason>"` to its `meta`; held items are never scheduled. Then run `npm run check:quiz && npm run check:content`, and commit. An item already in the schedule keeps showing until the fix is deployed.
3. Close the report:

   ```bash
   npm run reports -- close <report #id or item id> fixed "Corrected the reference to Art 59(3)" --by "Aidarous"
   npm run reports -- close ct-b2-044 no_change "Article 56 still requires 7 years" --by "Ashta"
   npm run reports -- close 42 duplicate "Same as #37" --by "Pranay"
   ```

   Closing by item id closes every open report on that item.
4. If the visitor left an email, reply to them. It's courteous, and a good opening for a conversation.

## Limits and privacy

- Up to 10 reports an hour from one device; the same person reporting the same item twice in a day is thanked but stored once.
- A hidden form field catches automated spam.
- The sender's IP address isn't stored, only a one-way hash used for the limits above.
- Reports are kept until they're dealt with, then for up to a year (privacy notice).
