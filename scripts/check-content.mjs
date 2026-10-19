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

function checkDocument(doc) {
  const problems = []; // { id, message }
  const value = (id) => findField(doc, id)?.field.value;
  const has = (id) => value(id) !== undefined;

  // One VAT rate per document: 5% standard or 0% zero-rated
  const rates = new Set(doc.lines.rows.map((r) => r.vatRate));
  const rateText = doc.lines.rows[0]?.vatRate;
  const rate = Number.parseFloat(rateText);
  if (rates.size > 1 || ![0, VAT_PERCENT].includes(rate)) {
    problems.push({ id: doc.lines.id, message: `unexpected VAT rates: ${[...rates].join(", ")}` });
  }

  // Line amounts
  let lineSum = 0;
  for (const row of doc.lines.rows) {
    const qty = Number(row.quantity.replace(/,/g, ""));
    const expected = qty * toFils(row.unitPrice);
    if (expected !== toFils(row.amount)) {
      problems.push({ id: row.id, message: `${row.quantity} x ${row.unitPrice} = ${show(expected)}, shown ${row.amount}` });
    }
    lineSum += toFils(row.amount);
  }

  if (!has("vat")) {
    problems.push({ id: "totals", message: "no VAT amount shown" });
  }
  // Net amount before VAT, used for the simplified-invoice limit
  let net = null;

  if (has("subtotal")) {
    // Prices before VAT: subtotal, optional discount, VAT added on top
    if (lineSum !== toFils(value("subtotal"))) {
      problems.push({ id: "subtotal", message: `lines add to ${show(lineSum)}, subtotal shown ${value("subtotal")}` });
    }
    let taxable = toFils(value("subtotal"));
    if (has("discount")) {
      const afterDiscount = taxable + toFils(value("discount"));
      if (has("taxable") && afterDiscount !== toFils(value("taxable"))) {
        problems.push({ id: "taxable", message: `after discount ${show(afterDiscount)}, shown ${value("taxable")}` });
      }
      taxable = afterDiscount;
    }
    net = taxable;
    const vat = has("vat") ? toFils(value("vat")) : 0;
    if (has("vat")) {
      const expectedVat = percentOf(taxable, rate);
      if (vat !== expectedVat) {
        problems.push({ id: "vat", message: `${rate}% of ${show(taxable)} = ${show(expectedVat)}, shown ${value("vat")}` });
      }
    }
    // Total is checked against the VAT as shown, so one wrong VAT figure
    // is reported once, not twice.
    if (taxable + vat !== toFils(value("total"))) {
      problems.push({ id: "total", message: `${show(taxable)} + ${show(vat)} = ${show(taxable + vat)}, shown ${value("total")}` });
    }

    // Conversion to AED when the invoice is in another currency
    if (doc.lines.currency !== "AED") {
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
    const expectedVat = Math.round((total * rate) / (100 + rate));
    net = total - expectedVat;
    if (has("vat") && toFils(value("vat")) !== expectedVat) {
      problems.push({ id: "vat", message: `VAT inside ${show(total)} = ${show(total)} x ${rate}/${100 + rate} = ${show(expectedVat)}, shown ${value("vat")}` });
    }
    if (has("net") && has("vat") && toFils(value("net")) + toFils(value("vat")) !== total) {
      problems.push({ id: "net", message: `${value("net")} + ${value("vat")} does not make ${value("total")}` });
    }
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

  // TRNs
  for (const block of doc.blocks.filter((b) => b.variant === "party")) {
    const trn = block.fields.find((f) => f.label.includes("TRN"));
    if (!trn) {
      if (block.id === "supplier") problems.push({ id: "supplier", message: "supplier has no TRN" });
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
  // charged at 5% is also a problem.
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
  if (rate === 0) {
    if (destination === undefined) problems.push({ id: "vat", message: "0% charged with no export details" });
    problems.push(...evidenceProblems);
  } else if (destination !== undefined && evidenceProblems.length === 0) {
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

const files = readdirSync(contentDir).filter((f) => /^shift-\d+\.json$/.test(f)).sort();
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
