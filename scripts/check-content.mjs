// Checks every Module 1 document before it can go live.
//
// Run with: npm run check:content
//
// It recalculates the arithmetic on each document (line amounts, subtotal,
// discount, 5% VAT, totals, currency conversion), checks TRN length and the
// 14-day invoice rule, then compares what it found with the document's answer:
//   - a "right" document must have no problems at all
//   - an "off" document's problems must all sit on its marked issue
// All money is handled in whole fils (1/100 AED) so there are no rounding
// surprises from decimals.

import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "src/content/review");
const VAT_PERCENT = 5;
const MAX_INVOICE_DAYS = 14;

const toFils = (text) => {
  const clean = text.replace(/,/g, "").trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(clean)) throw new Error(`Not an amount: "${text}"`);
  const [whole, frac = ""] = clean.replace("-", "").split(".");
  const fils = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return clean.startsWith("-") ? -fils : fils;
};
const show = (fils) => (fils / 100).toFixed(2);
// Rounds half up, the usual rule for VAT to the nearest fils.
const percentOf = (fils, percent) => Math.round((fils * percent) / 100);
const parseDate = (text) => {
  const d = new Date(`${text} UTC`);
  if (Number.isNaN(d.getTime())) throw new Error(`Not a date: "${text}"`);
  return d;
};

function findField(doc, id) {
  for (const block of doc.blocks) {
    const field = block.fields.find((f) => f.id === id);
    if (field) return { field, block };
  }
  return null;
}

const MISSING = /^(none|not held|not available|n\/a|-|—)?$/i;
const UAE_PLACE = /\bUAE\b|United Arab Emirates|Dubai|Abu Dhabi|Sharjah|Ajman|Umm Al Quwain|Ras Al Khaimah|Fujairah|Al Ain/i;
const SIMPLIFIED_LIMIT = 10_000_00; // AED 10,000 in fils
const EXPORT_DAYS = 90;
const days = (later, earlier) => (parseDate(later) - parseDate(earlier)) / 86_400_000;

// Rate labels a line can carry. "Not charged" is for invoices from suppliers
// outside the UAE, where the UAE customer accounts for VAT (reverse charge).
const TEXT_RATES = new Set(["Exempt", "Not charged"]);
const isForeign = (address) => address !== undefined && !UAE_PLACE.test(address);

function checkDocument(doc) {
  const problems = []; // { id, message }
  const value = (id) => findField(doc, id)?.field.value;
  const has = (id) => value(id) !== undefined;
  const correct = doc.meta?.correctTreatment; // checker-only: never sent to the browser
  const isImport = doc.kind === "import_declaration";
  const supplierAddress = doc.blocks.find((b) => b.id === "supplier")?.fields.find((f) => f.label.includes("address"))?.value;
  const foreignSupplier = isForeign(supplierAddress);

  // Rates: one rate per document (5%, 0%, Exempt or Not charged), or a
  // mixed invoice of 5% and Exempt lines (such as loan interest and a fee).
  const rates = new Set(doc.lines.rows.map((r) => r.vatRate));
  const mixed = rates.size === 2 && rates.has("5%") && rates.has("Exempt");
  const rateText = doc.lines.rows[0]?.vatRate;
  const textual = rates.size === 1 && TEXT_RATES.has(rateText);
  const rate = mixed ? VAT_PERCENT : Number.parseFloat(rateText);
  if (!mixed && (rates.size > 1 || (!textual && ![0, VAT_PERCENT].includes(rate)))) {
    problems.push({ id: doc.lines.id, message: `unexpected VAT rates: ${[...rates].join(", ")}` });
  }

  // Line amounts
  let lineSum = 0;
  let standardSum = 0;
  for (const row of doc.lines.rows) {
    const qty = Number(row.quantity.replace(/,/g, ""));
    const expected = qty * toFils(row.unitPrice);
    if (expected !== toFils(row.amount)) {
      problems.push({ id: row.id, message: `${row.quantity} x ${row.unitPrice} = ${show(expected)}, shown ${row.amount}` });
    }
    lineSum += toFils(row.amount);
    if (row.vatRate === "5%") standardSum += toFils(row.amount);
  }

  if (!has("vat") && !textual) {
    problems.push({ id: isImport ? "valuation" : "totals", message: "no VAT amount shown" });
  }
  // No VAT may be charged on a line marked Exempt or Not charged.
  if (textual && has("vat") && toFils(value("vat")) !== 0) {
    problems.push({ id: "vat", message: `VAT ${value("vat")} charged on lines marked "${rateText}"` });
  }
  // Net amount before VAT, used for the simplified-invoice limit
  let net = null;

  if (isImport) {
    // Import declarations: VAT is due on the customs value plus customs duty
    // (and any excise tax), whether paid at customs or by reverse charge.
    const customsValue = toFils(value("customs-value"));
    if (lineSum !== customsValue) {
      problems.push({ id: "customs-value", message: `goods add to ${show(lineSum)}, customs value shown ${value("customs-value")}` });
    }
    let base = customsValue;
    if (has("duty")) {
      const dutyLabel = findField(doc, "duty").field.label;
      const pct = Number(dutyLabel.match(/([\d.]+)%/)?.[1]);
      const duty = toFils(value("duty"));
      if (pct && percentOf(customsValue, pct) !== duty) {
        problems.push({ id: "duty", message: `${pct}% of ${show(customsValue)} = ${show(percentOf(customsValue, pct))}, shown ${value("duty")}` });
      }
      base += duty;
    }
    if (has("excise")) base += toFils(value("excise"));
    if (toFils(value("vat-base")) !== base) {
      problems.push({ id: "vat-base", message: `customs value + duty${has("excise") ? " + excise" : ""} = ${show(base)}, shown ${value("vat-base")}` });
    }
    if (has("vat")) {
      const expectedVat = percentOf(toFils(value("vat-base")), rate);
      if (toFils(value("vat")) !== expectedVat) {
        problems.push({ id: "vat", message: `${rate}% of ${value("vat-base")} = ${show(expectedVat)}, shown ${value("vat")}` });
      }
    }
    // Reverse charge on imports is for VAT-registered importers only.
    const reverse = /reverse charge/i.test(value("vat-treatment") ?? "");
    const importerTrn = doc.blocks.find((b) => b.id === "importer")?.fields.find((f) => f.label.includes("TRN"));
    if (reverse && !importerTrn) {
      problems.push({ id: "vat-treatment", message: "reverse charge shown, but the importer has no TRN (not VAT registered)" });
    }
  } else if (has("subtotal")) {
    // Prices before VAT: subtotal, optional discount, VAT added on top
    if (lineSum !== toFils(value("subtotal"))) {
      problems.push({ id: "subtotal", message: `lines add to ${show(lineSum)}, subtotal shown ${value("subtotal")}` });
    }
    let taxable = toFils(value("subtotal"));
    if (has("discount")) {
      if (mixed) problems.push({ id: "discount", message: "discounts on mixed-rate invoices aren't supported by the checker" });
      const afterDiscount = taxable + toFils(value("discount"));
      if (has("taxable") && afterDiscount !== toFils(value("taxable"))) {
        problems.push({ id: "taxable", message: `after discount ${show(afterDiscount)}, shown ${value("taxable")}` });
      }
      taxable = afterDiscount;
    }
    net = taxable;
    const vat = has("vat") ? toFils(value("vat")) : 0;
    if (has("vat") && !textual) {
      // On a mixed invoice, VAT is due only on the 5% lines.
      const vatBase = mixed ? standardSum : taxable;
      const expectedVat = percentOf(vatBase, rate);
      if (vat !== expectedVat) {
        problems.push({ id: "vat", message: `${rate}% of ${show(vatBase)}${mixed ? " (the 5% lines)" : ""} = ${show(expectedVat)}, shown ${value("vat")}` });
      }
    }
    // Total is checked against the VAT as shown, so one wrong VAT figure
    // is reported once, not twice.
    if (taxable + vat !== toFils(value("total"))) {
      problems.push({ id: "total", message: `${show(taxable)} + ${show(vat)} = ${show(taxable + vat)}, shown ${value("total")}` });
    }

    // Conversion to AED when a UAE VAT invoice is in another currency
    if (doc.lines.currency !== "AED" && !textual && !mixed) {
      const fx = value("fx-rate");
      if (!fx) {
        problems.push({ id: "totals", message: `${doc.lines.currency} invoice with no exchange rate` });
      } else {
        const fxRate = Number(fx.match(/=\s*([\d.]+)/)[1]);
        const aedTaxable = Math.round(taxable * fxRate);
        const aedVat = toFils(value("aed-vat"));
        if (aedTaxable !== toFils(value("aed-subtotal"))) {
          problems.push({ id: "aed-subtotal", message: `${show(taxable)} x ${fxRate} = ${show(aedTaxable)}, shown ${value("aed-subtotal")}` });
        }
        if (percentOf(aedTaxable, rate) !== aedVat) {
          problems.push({ id: "aed-vat", message: `${rate}% of ${show(aedTaxable)} = ${show(percentOf(aedTaxable, rate))}, shown ${value("aed-vat")}` });
        }
        if (aedTaxable + aedVat !== toFils(value("aed-total"))) {
          problems.push({ id: "aed-total", message: `${show(aedTaxable)} + ${show(aedVat)} = ${show(aedTaxable + aedVat)}, shown ${value("aed-total")}` });
        }
      }
    }
  } else if (has("total")) {
    // Prices include VAT: the VAT inside the total is total x rate / (100 + rate)
    const total = toFils(value("total"));
    if (lineSum !== total) {
      problems.push({ id: "total", message: `lines add to ${show(lineSum)}, total shown ${value("total")}` });
    }
    const expectedVat = textual ? 0 : Math.round((total * rate) / (100 + rate));
    net = total - expectedVat;
    if (has("vat") && !textual && toFils(value("vat")) !== expectedVat) {
      problems.push({ id: "vat", message: `VAT inside ${show(total)} = ${show(total)} x ${rate}/${100 + rate} = ${show(expectedVat)}, shown ${value("vat")}` });
    }
    if (has("net") && has("vat") && toFils(value("net")) + toFils(value("vat")) !== total) {
      problems.push({ id: "net", message: `${value("net")} + ${value("vat")} does not make ${value("total")}` });
    }
  }

  // A supplier outside the UAE with no TRN can't charge UAE VAT: the UAE
  // customer accounts for it instead (reverse charge).
  const supplierTrn = doc.blocks.find((b) => b.id === "supplier")?.fields.find((f) => f.label.includes("TRN"));
  if (foreignSupplier && !supplierTrn && !textual && rate > 0) {
    problems.push({ id: "vat", message: "a supplier outside the UAE with no TRN charges UAE VAT" });
  }

  // The intended VAT treatment (meta.correctTreatment) against what the
  // document shows. Mixed invoices are checked line by line above instead.
  const shownTreatment = isImport
    ? /reverse charge/i.test(value("vat-treatment") ?? "") ? "reverse_charge" : "import_paid_at_customs"
    : mixed
      ? null
      : textual
        ? rateText === "Exempt" ? "exempt" : foreignSupplier ? "reverse_charge" : "not_charged"
        : rate === 0 ? "zero" : "standard";
  if (correct && shownTreatment && shownTreatment !== correct) {
    problems.push({
      id: isImport ? "vat-treatment" : has("vat") ? "vat" : doc.lines.id,
      message: `shown as ${shownTreatment.replace(/_/g, " ")}, should be ${correct.replace(/_/g, " ")}`,
    });
  }

  // Title
  if (doc.kind === "tax_invoice" && doc.heading.value !== "TAX INVOICE") {
    problems.push({ id: "heading", message: `title is "${doc.heading.value}"` });
  }
  if (doc.kind === "simplified_tax_invoice" && !doc.heading.value.includes("TAX INVOICE")) {
    problems.push({ id: "heading", message: `title is "${doc.heading.value}"` });
  }

  // A simplified invoice to a registered customer must not exceed AED 10,000.
  // Content must stay clear of the limit both before and after VAT, so the
  // answer doesn't depend on which one the reader uses.
  const customerTrn = doc.blocks.find((b) => b.id === "customer")?.fields.find((f) => f.label.includes("TRN"));
  if (doc.kind === "simplified_tax_invoice" && customerTrn && net !== null) {
    const total = toFils(value("total"));
    if (net > SIMPLIFIED_LIMIT) {
      problems.push({ id: "heading", message: `simplified invoice to a registered customer for ${show(net)} before VAT, over 10,000.00` });
    } else if (total > SIMPLIFIED_LIMIT) {
      problems.push({ id: "heading", message: `ambiguous: ${show(net)} before VAT but ${show(total)} after; keep clear of the 10,000 limit` });
    }
  }

  // TRNs. A UAE supplier must show one; a supplier outside the UAE needn't.
  for (const block of doc.blocks.filter((b) => b.variant === "party")) {
    const trn = block.fields.find((f) => f.label.includes("TRN"));
    if (!trn) {
      if (block.id === "supplier" && !foreignSupplier) problems.push({ id: "supplier", message: "supplier has no TRN" });
      continue;
    }
    if (!/^\d{15}$/.test(trn.value)) {
      problems.push({ id: trn.id, message: `TRN "${trn.value}" has ${trn.value.replace(/\D/g, "").length} digits, not 15` });
    }
  }

  // Dates: an issue date, issued within 14 days of supply
  if (!has("issue-date")) {
    problems.push({ id: "details", message: "no date of issue" });
  } else if (has("supply-date")) {
    const gap = days(value("issue-date"), value("supply-date"));
    if (gap < 0 || gap > MAX_INVOICE_DAYS) {
      problems.push({ id: "issue-date", message: `issued ${gap} days after supply` });
    }
  }

  // Exports: 0% needs goods leaving the UAE, official and commercial
  // evidence, and export within 90 days of supply. A qualifying export
  // charged at 5% is also a problem. Zero rating for other reasons (such as
  // the first supply of a new home) is marked correctTreatment "zero".
  const destination = value("destination");
  const evidenceProblems = [];
  if (destination !== undefined && UAE_PLACE.test(destination)) {
    evidenceProblems.push({ id: "destination", message: `destination "${destination}" is in the UAE` });
  } else if (destination !== undefined) {
    for (const [id, what] of [["exit-declaration", "official evidence (exit declaration)"], ["transport-doc", "commercial evidence (transport document)"]]) {
      if (!has(id)) evidenceProblems.push({ id: "export-evidence", message: `no ${what}` });
      else if (MISSING.test(value(id).trim())) evidenceProblems.push({ id, message: `${what}: "${value(id)}"` });
    }
    if (has("export-date") && has("supply-date")) {
      const gap = days(value("export-date"), value("supply-date"));
      if (gap < 0 || gap > EXPORT_DAYS) evidenceProblems.push({ id: "export-date", message: `goods left ${gap} days after supply (limit ${EXPORT_DAYS})` });
    }
  }
  if (rate === 0 && !textual) {
    if (destination === undefined && correct !== "zero") problems.push({ id: "vat", message: "0% charged with no export details" });
    problems.push(...evidenceProblems);
  } else if (destination !== undefined && evidenceProblems.length === 0 && rate > 0) {
    problems.push({ id: "vat", message: `qualifying export to ${destination} charged at ${rate}% instead of 0%` });
  }

  return problems;
}

function allIds(doc) {
  const ids = new Set([doc.heading.id, doc.lines.id, ...doc.lines.rows.map((r) => r.id)]);
  for (const block of doc.blocks) {
    ids.add(block.id);
    block.fields.forEach((f) => ids.add(f.id));
  }
  return ids;
}

function blockOf(doc, id) {
  return findField(doc, id)?.block.id ?? (id.startsWith("line-") ? doc.lines.id : null);
}

// Shift files plus the daily-document pool (daily.json).
const files = readdirSync(contentDir).filter((f) => /^(shift-\d+|daily)\.json$/.test(f)).sort();
let errors = 0;
let warnings = 0;
const seen = new Set();

for (const file of files) {
  const docs = JSON.parse(readFileSync(join(contentDir, file), "utf8"));
  console.log(`\n${file}: ${docs.length} documents`);
  for (const doc of docs) {
    const fail = (msg) => { errors++; console.log(`  x ${doc.id}: ${msg}`); };
    if (seen.has(doc.id)) fail("duplicate id");
    seen.add(doc.id);
    for (const key of ["what", "why", "reference"]) {
      if (!doc.explanation?.[key]?.trim()) fail(`missing explanation.${key}`);
    }

    const ids = allIds(doc);
    const targets = doc.answer.verdict === "off" ? doc.answer.targets : [];
    targets.filter((t) => !ids.has(t)).forEach((t) => fail(`target "${t}" is not on the document`));

    let problems;
    try {
      problems = checkDocument(doc);
    } catch (e) {
      fail(e.message);
      continue;
    }
    const onTarget = (p) => targets.includes(p.id) || targets.includes(blockOf(doc, p.id));

    if (doc.answer.verdict === "right") {
      if (problems.length) problems.forEach((p) => fail(`marked right, but ${p.id}: ${p.message}`));
      else console.log(`  ok ${doc.id}  right`);
    } else {
      const stray = problems.filter((p) => !onTarget(p));
      stray.forEach((p) => fail(`unintended problem at ${p.id}: ${p.message}`));
      const found = problems.filter(onTarget);
      if (!found.length) {
        warnings++;
        console.log(`  ?  ${doc.id}  off at ${targets.join("/")}: not machine-checkable, reviewer to confirm`);
      } else if (!stray.length) {
        console.log(`  ok ${doc.id}  off at ${targets.join("/")}: ${found.map((p) => p.message).join("; ")}`);
      }
    }
  }
}

// Across all documents: one business, one TRN, and no two businesses
// sharing a TRN. Deliberately broken TRNs (not 15 digits) are skipped.
const trnByName = new Map();
const nameByTrn = new Map();
for (const file of files) {
  for (const doc of JSON.parse(readFileSync(join(contentDir, file), "utf8"))) {
    for (const block of doc.blocks.filter((b) => b.variant === "party")) {
      const name = block.fields.find((f) => f.label.endsWith("name"))?.value;
      const trn = block.fields.find((f) => f.label.includes("TRN"))?.value;
      if (!name || !trn || !/^\d{15}$/.test(trn)) continue;
      if (trnByName.has(name) && trnByName.get(name) !== trn) {
        errors++;
        console.log(`  x ${doc.id}: ${name} has TRN ${trn} here but ${trnByName.get(name)} elsewhere`);
      }
      if (nameByTrn.has(trn) && nameByTrn.get(trn) !== name) {
        errors++;
        console.log(`  x ${doc.id}: TRN ${trn} is used by both ${name} and ${nameByTrn.get(trn)}`);
      }
      trnByName.set(name, trn);
      nameByTrn.set(trn, name);
    }
  }
}

console.log(`\n${seen.size} documents, ${trnByName.size} businesses with TRNs, ${errors} errors, ${warnings} to confirm by hand`);
process.exit(errors ? 1 : 0);
