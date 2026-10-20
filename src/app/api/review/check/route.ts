import { NextResponse } from "next/server";
import { checkAnswer } from "@/lib/review/content";
import { recordAnswer } from "@/lib/review/record";
import type { CheckRequest } from "@/lib/review/types";

// POST /api/review/check
// Body: { docId, verdict: "right" | "off", targetId?, attemptId?, deskMs?, challengeCode? }
// Returns whether the answer was right, plus the explanation. For signed-in
// players the answer is also recorded against their attempt.
export async function POST(request: Request) {
  let body: Partial<CheckRequest> & { attemptId?: unknown; deskMs?: unknown; challengeCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { docId, verdict, targetId } = body;
  if (typeof docId !== "string" || (verdict !== "right" && verdict !== "off")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (targetId !== undefined && typeof targetId !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = checkAnswer({ docId, verdict, targetId });
  if (!result) return NextResponse.json({ error: "Document not found" }, { status: 404 });

  // Document ids start with their shift number, e.g. "s1-03".
  const shift = Number(docId.match(/^s(\d+)-/)?.[1]);
  const recorded = await recordAnswer({
    attemptId: body.attemptId,
    shift,
    docId,
    correct: result.correct,
    deskMs: body.deskMs,
    challengeCode: body.challengeCode,
  });

  return NextResponse.json({ ...result, correct: recorded?.correct ?? result.correct });
}
