# Content review checklist

Every item is a **draft** until a named reviewer signs it off. Sign-off is recorded in each item's `meta.reviewer` and `meta.reviewedOn`, with `meta.status` set to `"approved"`.

## Shift 1: Tax invoice basics (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-1.json`. The arithmetic on all 10 documents has been checked by `npm run check:content`. Reviewers check the **tax rule, the wording and the legal reference**.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s1-01 | Looks right | — | Exec. Reg. Art. 59(1) |
| s1-02 | Off | Supplier TRN missing | Exec. Reg. Art. 59(1)(b) |
| s1-03 | Off | VAT 230.50 should be 220.50 | Decree-Law Art. 3; Exec. Reg. Art. 59(1)(k) |
| s1-04 | Looks right | Supply 5 Oct, issued 12 Oct (7 days) | **Decree-Law Art. 67(1)**: please confirm the article for the 14-day rule |
| s1-05 | Off | Titled "INVOICE", not "TAX INVOICE" | Exec. Reg. Art. 59(1)(a) |
| s1-06 | Looks right | USD invoice with AED amounts at 3.6725 | **Exec. Reg. Art. 59(1)(h), (j), (k)**: please confirm against the current amended text |
| s1-07 | Off | Issued 26 days after supply | **Decree-Law Art. 67(1)**: as s1-04 |
| s1-08 | Looks right | VAT after a 10% discount | **Decree-Law Art. 36**: please confirm the article for value of supply |
| s1-09 | Off | VAT charged before the discount (70.00 should be 60.00) | **Decree-Law Art. 36**: as s1-08 |
| s1-10 | Off | Customer TRN has 14 digits | Exec. Reg. Art. 59(1)(c) |

References in **bold** are the ones Claude is least sure of. Please check them first.

Also confirm:

- Article 59 lettering is still correct after the amendments to the Executive Regulation (Cabinet Decision No. 100 of 2024).
- No business name or TRN matches a real business. All names are invented, and TRNs are 15-digit numbers ending in 0003. Please flag anything that looks real.
