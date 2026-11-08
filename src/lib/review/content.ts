import "server-only";

import shiftsData from "@/content/review/shifts.json";
import daily from "@/content/review/daily.json";
import shift1 from "@/content/review/shift-1.json";
import shift2 from "@/content/review/shift-2.json";
import shift3 from "@/content/review/shift-3.json";
import shift4 from "@/content/review/shift-4.json";
import shift5 from "@/content/review/shift-5.json";
import shift6 from "@/content/review/shift-6.json";
import type {
  CheckRequest,
  CheckResult,
  PublicDocument,
  ReviewDocument,
  ShiftInfo,
} from "./types";

// "server-only" above makes the build fail if a browser component ever
// imports this file, so answers can't leak into the page by accident.

const shifts = shiftsData as ShiftInfo[];
const documentsByShift: Record<number, ReviewDocument[]> = {
  1: shift1 as ReviewDocument[],
  2: shift2 as ReviewDocument[],
  3: shift3 as ReviewDocument[],
  4: shift4 as ReviewDocument[],
  5: shift5 as ReviewDocument[],
  6: shift6 as ReviewDocument[],
};
const dailyPool = daily as ReviewDocument[];
const documentsById = new Map(
  [...Object.values(documentsByShift).flat(), ...dailyPool].map((doc) => [doc.id, doc]),
);

// The daily document: d-001 on launch day, the next one each day after, the
// same for every player. Before launch it previews d-001. If the pool runs
// out it starts again from the top (add documents to the end of daily.json;
// never reorder, so past days stay the same).
export const DAILY_START = "2026-11-17";

function dailyIndex(date: string): number {
  const days = Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${DAILY_START}T00:00:00Z`)) / 86_400_000);
  return Math.max(0, days) % dailyPool.length;
}

// The whole document, answer included, for the "spot the error" slides
// (scripts/make-slides.mjs). Only the slides page, which is switched off on
// the live site, calls this.
export function getFullDocument(id: string): ReviewDocument | null {
  return documentsById.get(id) ?? null;
}

export function getDailyDocumentId(date: string): string | null {
  return dailyPool.length ? dailyPool[dailyIndex(date)].id : null;
}

export function getDailyDocument(date: string): PublicDocument | null {
  return dailyPool.length ? toPublic(dailyPool[dailyIndex(date)]) : null;
}

export function isDailyDocument(docId: string): boolean {
  return docId.startsWith("d-");
}

export function getShifts(): ShiftInfo[] {
  return shifts.map((s) => ({ ...s, available: s.available && !!documentsByShift[s.number] }));
}

export function getShift(number: number): ShiftInfo | undefined {
  return getShifts().find((s) => s.number === number);
}

export function getShiftDocuments(shift: number): PublicDocument[] {
  return (documentsByShift[shift] ?? []).map(toPublic);
}

// Copies only the parts the player is allowed to see.
function toPublic(doc: ReviewDocument): PublicDocument {
  return { id: doc.id, shift: doc.shift, kind: doc.kind, heading: doc.heading, blocks: doc.blocks, lines: doc.lines };
}

export function checkAnswer(req: CheckRequest): CheckResult | null {
  const doc = documentsById.get(req.docId);
  if (!doc) return null;

  let correct: boolean;
  if (doc.answer.verdict === "right") {
    correct = req.verdict === "right";
  } else {
    correct = req.verdict === "off" && !!req.targetId && isOnTarget(doc, req.targetId, doc.answer.targets);
  }

  return { correct, expected: doc.answer, explanation: doc.explanation };
}

// A tap counts if it's on a listed target, or on any field inside a listed
// block (for example, any line of the supplier block when its TRN is missing).
function isOnTarget(doc: ReviewDocument, tappedId: string, targets: string[]): boolean {
  if (targets.includes(tappedId)) return true;
  const block = doc.blocks.find((b) => b.fields.some((f) => f.id === tappedId));
  if (block && targets.includes(block.id)) return true;
  if (doc.lines.rows.some((r) => r.id === tappedId) && targets.includes(doc.lines.id)) return true;
  return false;
}
