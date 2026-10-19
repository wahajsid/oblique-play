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

function checkDocument(doc) {
  const problems = []; // { id, message }
  const value = (id) => findField(doc, id)?.field.value;

  // Line amounts and subtotal
  let lineSum = 0;
  for (const row of doc.lines.rows) {
    const qty = Number(row.quantity.replace(/,/g, ""));
    const expected = qty * toFils(row.unitPrice);
    if (expected !== toFils(row.amount)) {
      problems.push({ id: row.id, message: `${row.quantity} x ${row.unitPrice} = ${show(expected)}, shown ${row.amount}` });
    }
    if (row.vatRate !== `${VAT_PERCENT}%`) problems.push({ id: row.id, message: `VAT rate ${row.vatRate}` });
    lineSum += toFils(row.amount);
  }
  if (value("subtotal") !== undefined && lineSum !== toFils(value("subtotal"))) {
    problems.push({ id: "subtotal", message: `lines add to ${show(lineSum)}, subtotal shown ${value("subtotal")}` });
  }

  // Discount, VAT and total, in the invoice currency
  if (value("subtotal") !== undefined) {
    let taxable = toFils(value("subtotal"));
    if (value("discount") !== undefined) {
      const afterDiscount = taxable + toFils(value("discount"));
      if (value("taxable") !== undefined && afterDiscount !== toFils(value("taxable"))) {
        problems.push({ id: "taxable", message: `after discount ${show(afterDiscount)}, shown ${value("taxable")}` });
      }
      taxable = afterDiscount;
    }
    const vat = toFils(value("vat"));
    const expectedVat = percentOf(taxable, VAT_PERCENT);
    if (vat !== expectedVat) {
      problems.push({ id: "vat", message: `5% of ${show(taxable)} = ${show(expectedVat)}, shown ${value("vat")}` });
    }
    // Total is checked against the VAT as shown, so one wrong VAT figure
    // is reported once, not twice.
    if (taxable + vat !== toFils(value("total"))) {
      problems.push({ id: "total", message: `${show(taxable)} + ${show(vat)} = ${show(taxable + vat)}, shown ${value("total")}` });
    }

    // Conversion to AED when the invoice is in another currency
    if (doc.lines.currency !== "AED") {
      const rateText = value("fx-rate");
      if (!rateText) {
        problems.push({ id: "totals", message: `${doc.lines.currency} invoice with no exchange rate` });
      } else {
        const rate = Number(rateText.match(/=\s*([\d.]+)/)[1]);
        const aedTaxable = Math.round(taxable * rate);
        const aedVat = toFils(value("aed-vat"));
        if (aedTaxable !== toFils(value("aed-subtotal"))) {
          problems.push({ id: "aed-subtotal", message: `${show(taxable)} x ${rate} = ${show(aedTaxable)}, shown ${value("aed-subtotal")}` });
        }
        if (percentOf(aedTaxable, VAT_PERCENT) !== aedVat) {
          problems.push({ id: "aed-vat", message: `5% of ${show(aedTaxable)} = ${show(percentOf(aedTaxable, VAT_PERCENT))}, shown ${value("aed-vat")}` });
        }
        if (aedTaxable + aedVat !== toFils(value("aed-total"))) {
          problems.push({ id: "aed-total", message: `${show(aedTaxable)} + ${show(aedVat)} = ${show(aedTaxable + aedVat)}, shown ${value("aed-total")}` });
        }
      }
    }
  }

  // Title
  if (doc.kind === "tax_invoice" && doc.heading.value !== "TAX INVOICE") {
    problems.push({ id: "heading", message: `title is "${doc.heading.value}"` });
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

  // Dates: issued within 14 days of supply
  if (value("supply-date") && value("issue-date")) {
    const days = (parseDate(value("issue-date")) - parseDate(value("supply-date"))) / 86_400_000;
    if (days < 0 || days > MAX_INVOICE_DAYS) {
      problems.push({ id: "issue-date", message: `issued ${days} days after supply` });
    }
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

console.log(`\n${seen.size} documents, ${errors} errors, ${warnings} to confirm by hand`);
process.exit(errors ? 1 : 0);
