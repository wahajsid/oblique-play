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

## Shift 2: Simplified tax invoices (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-2.json`. The arithmetic is checked by `npm run check:content`, including the VAT inside VAT-inclusive prices (total × 5/105). Every figure quoted in the explanations was also re-checked separately.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s2-01 | Looks right | Café receipt to a walk-in customer, VAT 3.00 inside 63.00 | **Exec. Reg. Art. 59, simplified invoices** |
| s2-02 | Off | Supplier TRN missing | **as s2-01** |
| s2-03 | Looks right | Simplified invoice to a registered customer, 4,800.00 before VAT | **as s2-01** |
| s2-04 | Off | VAT taken as 5% of a VAT-inclusive total (63.00 should be 60.00) | Decree-Law Art. 3; **as s2-01** |
| s2-05 | Off | Simplified invoice to a registered customer for 13,940.00 before VAT (over 10,000) | **as s2-01** |
| s2-06 | Looks right | Simplified invoice of 12,600.00 to a private individual | **as s2-01** |
| s2-07 | Off | VAT amount not shown | **as s2-01** |
| s2-08 | Looks right | Receipt showing 1,000.00 + VAT 50.00 = 1,050.00 | Decree-Law Art. 3; **as s2-01** |
| s2-09 | Off | No date of issue | **as s2-01** |
| s2-10 | Off | Titled "CASH RECEIPT", not "Tax Invoice" | **as s2-01** |

The references for this shift deliberately say "Article 59 (simplified tax invoices)" without a paragraph number. Claude's recollection is that the "when allowed" rule and the list of contents are separate paragraphs of Article 59 (possibly 59(5) and 59(6)), while the plan's author recalled Article 60. **Please insert the exact article and paragraph numbers.**

Also confirm:

- **The AED 10,000 limit:** is it measured before or after VAT? The content avoids the question. s2-03 is under the limit both ways (4,800.00 / 5,040.00) and s2-05 is over it both ways (13,940.00 / 14,637.00). The checker refuses any document that falls between the two.
- **s2-03 and s2-05 show the customer's TRN on a simplified invoice.** That is how the player can tell the customer is registered. Is it fine for a simplified invoice to carry extra details like this?
- **s2-06:** a simplified invoice to a non-registered individual is fine at any amount.

## Shift 3: Zero-rated exports (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-3.json`. The checker now also tests the export conditions: the destination must be outside the UAE, there must be both an exit declaration and a transport document, and the goods must leave within 90 days of supply (90 days passes, 92 fails). A qualifying export charged at 5% is flagged too. All destinations are outside the GCC, to keep the implementing-state rules out of the answers.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s3-01 | Looks right | Export to Kenya, both kinds of evidence, left 2 days after supply | **Decree-Law Art. 45; Exec. Reg. Art. 30** |
| s3-02 | Off | 0% charged, but the goods were delivered in Dubai to a UK customer (VAT should be 1,605.00) | **Decree-Law Art. 27 (place of supply of goods) and Art. 45** |
| s3-03 | Looks right | Air export to the UK with an airway bill | **as s3-01** |
| s3-04 | Off | No exit declaration and no bill of lading | **as s3-01** |
| s3-05 | Looks right | Goods left 54 days after supply (within 90) | **as s3-01** |
| s3-06 | Off | Qualifying export charged at 5% (650.00 overcharged) | **as s3-01**. Please also confirm the wording that zero-rating "isn't optional" |
| s3-07 | Off | Goods left 120 days after supply | **Exec. Reg. Art. 30** (90-day rule and the tax authority's power to extend it) |
| s3-08 | Looks right | Export to Mauritius, left 11 days after supply | **as s3-01** |
| s3-09 | Off | Bill of lading held, but no exit declaration | **Exec. Reg. Art. 30** (both official and commercial evidence needed) |
| s3-10 | Off | VAT 0.00, but the total includes 480.00 of VAT | Decree-Law Art. 45; Exec. Reg. Art. 59(1) |

Also confirm:

- **s3-04, s3-07 and s3-09 say VAT of 5% "would be due" or "would apply"** when the zero-rating conditions fail. Is that the right way to put it, for example for a supplier who later obtains the evidence?
- **The evidence terms used:** "exit declaration" for official evidence; "bill of lading" and "airway bill" for commercial evidence.
- The foreign customer names (Kilima Office Furnishings, Harbourline Hotels, Brightleaf Roasters, Lion Rock Tech Traders, Nordkai Delikatessen, Coral Coast Publishing, Savile Lane Outfitters, Lagoon Leisure Supplies, Andes Home Studio, Harbour Bake House) are invented. Please flag any that match a real company. Airway bill numbers use the prefix 999 so they can't match a real airline.
