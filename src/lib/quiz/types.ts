// Shapes for Module 2 (daily quiz) content.

export type Track = "ct" | "vat";
export type PlayTrack = Track | "both";

export type Difficulty = "foundation" | "intermediate" | "advanced";

// mcq:        a question with four options
// true_false: a statement; options are exactly ["True", "False"]
// scenario:   a short fictional business situation, then one question with four options
// spot_issue: a short extract; each option is one line of it, and the player
//             taps the line with the error
export type QuestionFormat = "mcq" | "true_false" | "scenario" | "spot_issue";

export type QuizQuestion = {
  id: string;
  track: Track;
  format: QuestionFormat;
  difficulty: Difficulty;
  // A key from src/content/quiz/topics.json for this track.
  topic: string;
  // Scenario text (scenario format) or the extract's heading (spot_issue).
  scenario?: string;
  prompt: string;
  options: string[];
  answerIndex: number;
  explanation: {
    what: string;
    why: string;
    reference: string;
  };
  meta: {
    // The date the rule applies from, and (if it ends) the last date it applies.
    appliesFrom: string;
    appliesUntil?: string;
    status: "draft" | "approved";
    reviewer: string | null;
    reviewedOn: string | null;
    // Where the item came from, e.g. "passdrill:tax-uae-tax-009" or "oblique:batch-01".
    source: string;
    // Notes for the reviewer: uncertain references, verifier disagreements.
    reviewNotes?: string;
    // Set when an item must not be used until fixed (for example, the blind
    // verifier disagreed with the answer). Held items are never scheduled.
    hold?: string;
  };
};

// What the browser receives before answering: no answer, no explanation.
export type PublicQuestion = Pick<QuizQuestion, "id" | "track" | "format" | "topic" | "scenario" | "prompt" | "options"> & {
  difficulty: Difficulty;
};

export type DailySet = {
  date: string; // YYYY-MM-DD, UAE calendar
  ct: string[]; // 20 question ids, in play order
  vat: string[];
};

export type QuizCheckResult = {
  correct: boolean;
  answerIndex: number;
  explanation: QuizQuestion["explanation"];
};
