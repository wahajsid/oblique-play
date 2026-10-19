"use client";

import type { DocBlock, DocField, LineItem, PublicDocument } from "@/lib/review/types";

export type DocMode = "browse" | "select" | "reveal";
export type Stamp = "right" | "off" | null;

type Props = {
  doc: PublicDocument;
  mode: DocMode;
  selectedId: string | null;
  // Ids to highlight once the answer is shown (fields, rows or whole blocks).
  revealIds?: string[];
  stamp: Stamp;
  onTap: (id: string, label: string) => void;
};

export function TaxDocument({ doc, mode, selectedId, revealIds = [], stamp, onTap }: Props) {
  const isRevealed = (id: string) => mode === "reveal" && revealIds.includes(id);

  const tapClass = (id: string, extra = "") => {
    const base = `block w-full min-h-11 rounded-md px-2 text-left transition-colors ${extra}`;
    if (selectedId === id) return `${base} bg-accent-soft ring-2 ring-accent`;
    if (isRevealed(id)) return `${base} bg-notquite-soft outline-2 outline-dashed outline-notquite`;
    if (mode === "select") return `${base} hover:bg-accent-soft/60 ring-1 ring-paper-line`;
    return `${base} hover:bg-black/[0.03]`;
  };

  const fieldButton = (field: DocField, children: React.ReactNode, extra = "") => (
    <button
      key={field.id}
      type="button"
      onClick={() => onTap(field.id, field.label)}
      aria-pressed={mode === "select" ? selectedId === field.id : undefined}
      aria-label={`${field.label}: ${field.value}`}
      data-part={field.id}
      className={tapClass(field.id, extra)}
    >
      {children}
    </button>
  );

  const valueClass = (field: DocField) =>
    field.style === "strong" ? "font-semibold" : field.style === "mono" ? "font-mono tracking-wide" : "";

  const renderBlock = (block: DocBlock) => {
    const blockHighlight = isRevealed(block.id) ? "rounded-lg outline-2 outline-dashed outline-notquite bg-notquite-soft/60" : "";

    if (block.variant === "party") {
      return (
        <section key={block.id} data-part={block.id} className={`py-2 ${blockHighlight}`} aria-label={block.title}>
          <h3 className="px-2 text-[11px] font-semibold tracking-widest text-paper-muted uppercase">{block.title}</h3>
          {block.fields.map((field) =>
            fieldButton(
              field,
              <span className="flex min-h-11 items-center gap-2 py-1 text-[15px] leading-snug">
                {field.label.includes("TRN") && <span className="text-xs font-semibold text-paper-muted">TRN</span>}
                <span className={valueClass(field)}>{field.value}</span>
              </span>,
            ),
          )}
        </section>
      );
    }

    // details, totals and notes: label on the left, value on the right
    const isTotals = block.variant === "totals";
    return (
      <section
        key={block.id}
        data-part={block.id}
        className={`py-2 ${isTotals ? "border-t border-paper-line" : ""} ${blockHighlight}`}
        aria-label={block.title}
      >
        <h3 className="px-2 text-[11px] font-semibold tracking-widest text-paper-muted uppercase">{block.title}</h3>
        {block.fields.map((field) =>
          fieldButton(
            field,
            <span className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
              <span className="text-paper-muted">{field.label}</span>
              <span className={`text-right tabular-nums ${valueClass(field)}`}>{field.value}</span>
            </span>,
          ),
        )}
      </section>
    );
  };

  const renderLine = (row: LineItem) => (
    <li key={row.id}>
      <button
        type="button"
        onClick={() => onTap(row.id, `Line: ${row.description}`)}
        aria-pressed={mode === "select" ? selectedId === row.id : undefined}
        data-part={row.id}
        aria-label={`${row.description}, ${row.quantity} at ${row.unitPrice}, VAT ${row.vatRate}, amount ${row.amount}`}
        className={tapClass(row.id, "py-2")}
      >
        <span className="flex items-start justify-between gap-3 text-[15px]">
          <span className="leading-snug">{row.description}</span>
          <span className="tabular-nums">{row.amount}</span>
        </span>
        <span className="mt-0.5 block text-[13px] text-paper-muted tabular-nums">
          {row.quantity} × {row.unitPrice} · VAT {row.vatRate}
        </span>
      </button>
    </li>
  );

  const parties = doc.blocks.filter((b) => b.variant === "party");
  const details = doc.blocks.filter((b) => b.variant === "details");
  const totals = doc.blocks.filter((b) => b.variant === "totals" || b.variant === "notes");
  const linesHighlight = isRevealed(doc.lines.id) ? "rounded-lg outline-2 outline-dashed outline-notquite" : "";

  return (
    <article
      className="relative overflow-hidden rounded-xl border border-paper-line bg-paper p-3 text-paper-ink shadow-[0_1px_0_rgba(0,0,0,0.04),0_12px_32px_-12px_rgba(0,0,0,0.25)]"
      aria-label="Document under review"
    >
      {fieldButton(
        doc.heading,
        <span className="flex min-h-12 items-center justify-center text-lg font-bold tracking-[0.2em]">
          {doc.heading.value}
        </span>,
        "text-center",
      )}

      <div className="mt-1 border-t border-paper-line">{parties.map(renderBlock)}</div>
      <div className="border-t border-paper-line">{details.map(renderBlock)}</div>

      <section data-part={doc.lines.id} className={`border-t border-paper-line py-2 ${linesHighlight}`} aria-label="Items">
        <h3 className="flex justify-between px-2 text-[11px] font-semibold tracking-widest text-paper-muted uppercase">
          <span>Items</span>
          <span>{doc.lines.currency}</span>
        </h3>
        <ul>{doc.lines.rows.map(renderLine)}</ul>
      </section>

      {totals.map(renderBlock)}

      {stamp && (
        <div
          aria-hidden="true"
          className="anim-stamp pointer-events-none absolute top-1/3 left-1/2 rounded-lg border-4 border-accent px-4 py-1.5 text-2xl font-black tracking-widest whitespace-nowrap text-accent uppercase"
        >
          {stamp === "right" ? "Looks right" : "Flagged"}
        </div>
      )}
    </article>
  );
}
