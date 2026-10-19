"use client";

import { useEffect, useRef } from "react";
import type { PublicDocument } from "@/lib/review/types";

export type ZoomContent = { label: string; lines: string[] };

// Finds what to show, large, for a tapped part of the document.
export function describeTarget(doc: PublicDocument, id: string, label: string): ZoomContent {
  if (id === doc.heading.id) return { label, lines: [doc.heading.value] };
  const row = doc.lines.rows.find((r) => r.id === id);
  if (row) {
    return {
      label: "Line item",
      lines: [
        row.description,
        `${row.quantity} × ${row.unitPrice} ${doc.lines.currency}`,
        `VAT ${row.vatRate}`,
        `Amount ${row.amount} ${doc.lines.currency}`,
      ],
    };
  }
  for (const block of doc.blocks) {
    const field = block.fields.find((f) => f.id === id);
    if (field) return { label: field.label, lines: [field.value] };
  }
  return { label, lines: [] };
}

export function ZoomSheet({ content, onClose }: { content: ZoomContent; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="zoom-title"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet-up pb-safe mx-auto w-full max-w-md rounded-t-2xl bg-paper px-5 pt-4 text-paper-ink"
      >
        <p id="zoom-title" className="text-xs font-semibold tracking-widest text-paper-muted uppercase">
          {content.label}
        </p>
        <div className="mt-2 space-y-1">
          {content.lines.map((line, i) => (
            <p key={i} className={`break-words tabular-nums ${i === 0 ? "text-3xl font-semibold" : "text-xl"}`}>
              {line}
            </p>
          ))}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="mt-5 min-h-12 w-full rounded-full border border-paper-line text-base font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  );
}
