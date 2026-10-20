// Shapes for Module 1 (document review) content.
//
// Every value on a document is stored as display text, exactly as the player
// sees it. That lets us draw documents with deliberate mistakes in them.
// scripts/check-content.mjs re-does the arithmetic so we know which mistakes
// are intended and which are typos.

export type FieldStyle = "strong" | "mono" | "muted";

export type DocField = {
  id: string;
  label: string;
  value: string;
  style?: FieldStyle;
};

export type BlockVariant = "party" | "details" | "totals" | "notes";

export type DocBlock = {
  id: string;
  title: string;
  variant: BlockVariant;
  fields: DocField[];
};

export type LineItem = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
  amount: string;
};

export type DocLines = {
  id: string;
  currency: string;
  rows: LineItem[];
};

export type Verdict = "right" | "off";

export type Answer =
  | { verdict: "right" }
  // targets: ids of fields, line rows or whole blocks that count as the issue.
  // Tapping any field inside a listed block also counts.
  | { verdict: "off"; targets: string[]; targetLabel: string };

export type Explanation = {
  what: string;
  why: string;
  reference: string;
};

export type ReviewMeta = {
  topic: string;
  difficulty: "foundation" | "intermediate" | "advanced";
  appliesFrom: string;
  // For the content checker: the VAT treatment the document should have.
  correctTreatment?: "standard" | "zero" | "exempt" | "reverse_charge" | "import_paid_at_customs";
  status: "draft" | "approved";
  reviewer: string | null;
  reviewedOn: string | null;
};

export type ReviewDocument = {
  id: string;
  shift: number;
  kind: string;
  heading: DocField;
  blocks: DocBlock[];
  lines: DocLines;
  answer: Answer;
  explanation: Explanation;
  meta: ReviewMeta;
};

// What the browser receives: the document without its answer or explanation,
// so the answer can't be read before the player commits.
export type PublicDocument = Omit<ReviewDocument, "answer" | "explanation" | "meta">;

export type ShiftInfo = {
  number: number;
  title: string;
  summary: string;
  available: boolean;
};

export type CheckRequest = {
  docId: string;
  verdict: Verdict;
  targetId?: string;
};

export type CheckResult = {
  correct: boolean;
  expected: Answer;
  explanation: Explanation;
};
