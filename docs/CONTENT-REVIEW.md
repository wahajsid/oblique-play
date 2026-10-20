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

## Shift 4: Exempt supplies (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-4.json`. The checker now also knows the intended VAT treatment of each document (`meta.correctTreatment`, never sent to players) and flags any document whose rate doesn't match it, VAT charged on lines marked Exempt, and mixed invoices (VAT only on the 5% lines). Every figure in the explanations was re-checked separately.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s4-01 | Looks right | Residential lease renewal (building completed 2014), exempt, no VAT | Decree-Law Art. 46; **Art. 45 and Exec. Reg. Art. 37** (first supply within 3 years zero-rated) |
| s4-02 | Off | 5% VAT (300.00) charged on residential rent | as s4-01 |
| s4-03 | Looks right | Office rent at 5% (1,500.00 on 30,000.00) | Decree-Law Arts. 3 and 46 |
| s4-04 | Off | Warehouse rent marked Exempt; should be a tax invoice at 5% (1,200.00) | as s4-03 |
| s4-05 | Looks right | Taxi journeys within Abu Dhabi, exempt local passenger transport | **Decree-Law Art. 46** (paragraph for local passenger transport) |
| s4-06 | Off | 5% charged on group life cover; life insurance is exempt | **Decree-Law Art. 46; Exec. Reg. Art. 42** |
| s4-07 | Looks right | Sale of bare land, exempt | **Decree-Law Art. 46** (paragraph for bare land) |
| s4-08 | Off | Residential renewal shown at 0%; should be exempt | as s4-01 |
| s4-09 | Off | First sale of a new villa (completed 12 Jun 2026) marked Exempt; should be zero-rated | **Decree-Law Art. 45** (first supply of residential buildings); Exec. Reg. Art. 37 |
| s4-10 | Off | Loan interest (exempt) plus fee (5%): VAT charged on both (695.00); should be 75.00 on the fee | **Exec. Reg. Art. 42** (margin-based vs fee-based financial services) |

Also confirm:

- **Ordinary invoices for exempt supplies.** s4-01, s4-05 and s4-07 are titled "INVOICE", not "TAX INVOICE", because no VAT is charged. Shift 1 teaches that a full tax invoice must say "Tax Invoice". Is the contrast fine, or should exempt documents carry a different title?
- **s4-05:** taxi journeys within one emirate are exempt local passenger transport.
- **s4-06:** group life cover for employees is exempt life insurance.
- **s4-10:** the explanation treats loan interest as exempt and an explicit arrangement fee as standard-rated.

## Shift 5: Reverse charge on imports (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-5.json`. Two new document types:
- an invoice from a supplier outside the UAE, with lines marked "Not charged"
- an import declaration, showing customs value (CIF), customs duty at 5%, value for VAT and VAT

The checker tests: duty = 5% of the customs value; value for VAT = customs value + duty (+ excise if shown); VAT = 5% of the value for VAT; reverse charge only with an importer TRN; and a supplier outside the UAE with no TRN must not charge UAE VAT. Nothing here depends on reverse-charge self-invoicing (reportedly removed by Federal Decree-Law No. 16 of 2025) or on the precious-metals reverse charge.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s5-01 | Looks right | UK software licence (USD 6,000.00), no UAE VAT; customer reverse-charges | Decree-Law Art. 48 |
| s5-02 | Off | Canadian supplier with no TRN adds "UAE VAT" of 900.00 | Decree-Law Art. 48 |
| s5-03 | Looks right | Registered importer: 40,000.00 + duty 2,000.00 = 42,000.00; VAT 2,100.00 by reverse charge | **Decree-Law Arts. 48 and 50** (value of imported goods) |
| s5-04 | Off | Value for VAT leaves out duty: 60,000.00 shown, should be 63,000.00 (VAT 3,150.00) | **Decree-Law Art. 50** |
| s5-05 | Looks right | Unregistered importer pays 378.00 at customs | **Decree-Law Arts. 48, 49 and 50** |
| s5-06 | Off | Unregistered importer (no TRN) claims the reverse charge | **Decree-Law Arts. 48 and 49** |
| s5-07 | Off | Importer TRN has 14 digits | **Exec. Reg. Art. 48** (conditions for the import reverse charge) |
| s5-08 | Looks right | Singapore social-media campaign, no UAE VAT; customer reverse-charges | Decree-Law Art. 48 |
| s5-09 | Off | Import shown at 0% under the reverse charge; VAT is still 1,764.00 | Decree-Law Arts. 48 and 50 |
| s5-10 | Off | VAT 2,527.50 shown; 5% of 51,450.00 is 2,572.50 (digits swapped) | Decree-Law Art. 50 |

Also confirm:

- **The general customs duty rate of 5% of CIF value** is used for all goods here (office chairs, ovens, wax, fabric, pumps, espresso machines, desks). Please flag any that would normally carry a different rate.
- **Import VAT base = customs value + customs duty (+ excise).** Confirm Art. 50 is the right citation.
- **s5-05 and s5-06:** an unregistered importer pays import VAT at customs before release (Art. 49 or the Executive Regulation?).
- **s5-07:** the verifier noted that the import reverse charge depends on the Exec. Reg. Art. 48(1) conditions, such as the importer's own customs registration. The documents show an "Importer customs code". Is the wording of s5-07's explanation fine?
- **s5-01 and s5-08:** the explanations say the customer "can normally recover" the reverse-charged VAT in the same return. That depends on the customer making taxable supplies.
- Invented foreign suppliers: Thistle Cloud Software, Kestrel Analytics, Ridgeway Furniture Manufacturing, Torino Macchine Forni, Torino Macchine Caffè, Lantern Quay Trading, Lantern Quay Media, Andalus Loom Textiles, Kessler Pumpenwerk. UAE-side invented names: Little Fig Home Bakery and Amber Wick Candles (not VAT registered). Please flag any that match a real business.

## Shift 6: Mixed review (VAT, for Aidarous or Arslan)

File: `src/content/review/shift-6.json`. Draws on Shifts 1–5, slightly harder.

| ID | Answer | Issue | Reference to confirm |
| --- | --- | --- | --- |
| s6-01 | Looks right | Discount and 14-day rule: 5,880.00 − 294.00 = 5,586.00; VAT 279.30 | Exec. Reg. Art. 59(1); **Decree-Law Art. 67(1)** |
| s6-02 | Off | Export left 95 days after supply (limit 90); 2,175.00 would be due | **Exec. Reg. Art. 30** |
| s6-03 | Looks right | First lease of a townhouse completed 12 Jun 2026, at 0% | **Decree-Law Art. 45; Exec. Reg. Art. 37** |
| s6-04 | Off | 5% (32,000.00) charged on a sale of bare land | **Decree-Law Art. 46** |
| s6-05 | Off | AED VAT 882.40; 5% of AED 17,628.00 is 881.40 | Exec. Reg. Art. 59(1)(h), (j), (k) |
| s6-06 | Looks right | Import by reverse charge: 47,700.00 + 2,385.00 = 50,085.00; VAT 2,504.25 | **Decree-Law Arts. 48 and 50** |
| s6-07 | Off | Hotel room nights marked "Exempt: residential accommodation"; should be 5% (378.00) | **Exec. Reg. Art. 37** (hotels aren't residential buildings) |
| s6-08 | Looks right | Simplified invoice to a registered customer, 2,730.00 incl. VAT 130.00 | **Exec. Reg. Art. 59 (simplified tax invoices)** |
| s6-09 | Off | Gala dinner in Abu Dhabi for a UK client zero-rated; services enjoyed in the UAE are 5% (2,900.00) | **Exec. Reg. Art. 31** (export of services) |
| s6-10 | Off | Import VAT 3,620.00 is 5% of CIF only; should be 3,801.00 on 76,020.00 | Decree-Law Art. 50 |

Also confirm:

- **s6-02** is dated July 2026, so the invoice was issued in July and the goods left in October.
- **s6-07** leaves out municipality and tourism fees on hotel bills on purpose.
- **s6-09** is the least certain item in these shifts: a service performed and enjoyed in the UAE isn't a zero-rated export, even when the client is abroad. Please confirm the reasoning and the article.
