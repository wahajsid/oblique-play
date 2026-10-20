# Content review: daily document pool (VAT, for Aidarous or Arslan)

File: `src/content/review/daily.json`. One document a day, the same for every player, shown in order from d-001 on launch day. All 30 are **drafts** until a named reviewer signs them off (`meta.reviewer`, `meta.reviewedOn`, `meta.status: "approved"`).

They use only the rule families of Shifts 1–3: tax invoice basics, simplified tax invoices and zero-rated exports. 12 look right and 18 have one issue each.

The arithmetic on every document is checked by `npm run check:content` (0 errors). Every figure in the explanations was also recomputed separately in exact decimals. Reviewers check the **tax rule, the wording and the reference**.

| ID | Answer | Rule family | Issue | Reference to confirm |
| --- | --- | --- | --- | --- |
| d-001 | Looks right | Tax invoice basics | Bikes to a registered customer, 13,270.00 + 663.50 | Exec. Reg. Art. 59(1) |
| d-002 | Off | Simplified | VAT taken as 5% of a VAT-inclusive 157.50 (7.88 should be 7.50) | Decree-Law Art. 3; **Exec. Reg. Art. 59 (simplified)** |
| d-003 | Looks right | Exports | Rugs by sea to Finland, both kinds of evidence, left after 4 days | **Decree-Law Art. 45; Exec. Reg. Art. 30** |
| d-004 | Off | Tax invoice basics | Supplier TRN has 16 digits | Exec. Reg. Art. 59(1)(b) |
| d-005 | Looks right | Simplified | Salon receipt to a walk-in customer, VAT 21.00 inside 441.00 | **Exec. Reg. Art. 59 (simplified)** |
| d-006 | Off | Exports | Exit declaration held, but no bill of lading | **Exec. Reg. Art. 30** |
| d-007 | Off | Tax invoice basics | Issued 18 days after supply | **Decree-Law Art. 67(1)** |
| d-008 | Off | Simplified | Simplified invoice to a registered customer for 15,600.00 before VAT (over 10,000) | **Exec. Reg. Art. 59 (simplified)** |
| d-009 | Looks right | Tax invoice basics | EUR invoice with AED amounts at 4.2000 | **Exec. Reg. Art. 59(1)(h), (j), (k)** |
| d-010 | Looks right | Exports | Bikes by air to Germany with an airway bill | **as d-003** |
| d-011 | Looks right | Simplified | Simplified invoice to a registered customer, 2,900.00 before VAT | **Exec. Reg. Art. 59 (simplified)** |
| d-012 | Off | Tax invoice basics | Line amount 27,900.00 should be 29,700.00 (15 × 1,980.00) | Exec. Reg. Art. 59(1)(h), (k) |
| d-013 | Off | Exports | Goods left 97 days after supply | **Exec. Reg. Art. 30** (90-day rule) |
| d-014 | Looks right | Tax invoice basics | VAT after an 8% discount: 17,940.00 + 897.00 | **Exec. Reg. Art. 59(1)(i); Decree-Law Art. 36** |
| d-015 | Off | Simplified | Bookshop receipt with no supplier TRN | **Exec. Reg. Art. 59 (simplified)** |
| d-016 | Looks right | Exports | Solar panels by sea to Morocco | **as d-003** |
| d-017 | Off | Tax invoice basics | VAT charged at 15% instead of 5% | Decree-Law Art. 3 |
| d-018 | Looks right | Simplified | Bike service receipt, VAT 15.50 inside 325.50 | Decree-Law Art. 3; **Exec. Reg. Art. 59 (simplified)** |
| d-019 | Off | Exports | Qualifying export to Canada charged at 5% (1,900.00 overcharged) | **as d-003** |
| d-020 | Looks right | Tax invoice basics | Issued 13 days after supply, both dates shown | Exec. Reg. Art. 59(1)(f); **Decree-Law Art. 67(1)** |
| d-021 | Off | Simplified | Receipt with no date of issue | **Exec. Reg. Art. 59 (simplified)** |
| d-022 | Looks right | Exports | Goods left 89 days after supply (within 90) | **Exec. Reg. Art. 30** |
| d-023 | Off | Tax invoice basics | Total 4,627.50 should be 4,672.50 | Exec. Reg. Art. 59(1)(j), (k) |
| d-024 | Looks right | Simplified | Simplified invoice to a private boat owner, prices before VAT | **Exec. Reg. Art. 59 (simplified)** |
| d-025 | Off | Exports | 0% charged, but the goods were delivered on Yas Island to a Canadian customer (VAT should be 785.00) | **Decree-Law Arts. 27 and 45** |
| d-026 | Off | Tax invoice basics | Taxable amount after discount 23,679.00 should be 23,769.00 | **Exec. Reg. Art. 59(1)(i); Decree-Law Art. 36** |
| d-027 | Off | Simplified | Receipt total 238.50 should be 283.50 | Decree-Law Art. 3; **Exec. Reg. Art. 59 (simplified)** |
| d-028 | Off | Zero rating | Dates sold to a Dubai cafe at 0%; food isn't zero-rated in the UAE (VAT should be 190.00) | **Decree-Law Arts. 3 and 45** |
| d-029 | Off | Tax invoice basics | Full tax invoice with no date of issue | Exec. Reg. Art. 59(1)(e) |
| d-030 | Off | Simplified | Titled "Simplified Invoice", missing the word "Tax" | **Exec. Reg. Art. 59 (simplified)** |

References in **bold** are the ones Claude is least sure of. The Shift 1–3 queries apply here too: the exact paragraph for simplified invoices, Article 67(1) for the 14-day rule, and Article 36 for discounts.

Also confirm:

- **d-015:** printed books sold by a bookshop are standard-rated (5%). The item relies on this.
- **d-028:** food, including dates, is standard-rated in the UAE. Nothing on the zero-rated list covers it.
- **d-017:** the explanation says 15% "is the rate in Saudi Arabia". Is it fine to name another country?
- **d-008:** the explanation says a full tax invoice was needed "with the customer's address and more detail". Please check the wording.
- **d-013 and d-022:** each invoice shows the date the goods later left the UAE, as Shift 3 does. In practice that would sit in the supplier's export file rather than on the invoice issued at the time.
- **d-025:** the evidence lines say "Not applicable", because the goods never left.
- **New invented names:** Jebel Trail Bikes, Pearl Loom Carpets, Sabkha Solar Installations, Wadi Spice Kitchen, Lantern Peak Fitness, Falaj Water Systems, Dhow Point Marine Supplies, Henna & Honey Salon, Ghaf Tree Landscaping, Silverkey Locksmiths, Brass Kettle Cafe Equipment and Sandgrouse Bookshop (all with LLC). The foreign customers are Baltic Bay Interiors, Southern Cross Marine, Maple Ridge Cafes, Atlas Lane Trading, Kestrel Outdoor, Indigo Coast Retail, Lotus Bay Spa and Omar Saleh (a private individual). Please flag any that match a real business. Their TRNs are 15 digits ending in 0003 and don't repeat any existing TRN.
- Nothing here depends on Cabinet Decision No. 149 of 2026 (from 1 Oct 2026). Dates run from 3 Nov to 1 Dec 2026. The two export-timing items use supply dates of 28 Aug and 4 Sep.
