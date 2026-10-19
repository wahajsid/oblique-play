import "server-only";

import shiftsData from "@/content/review/shifts.json";
import shift1 from "@/content/review/shift-1.json";
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
};
const documentsById = new Map(
  Object.values(documentsByShift)
    .flat()
    .map((doc) => [doc.id, doc]),
);

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
