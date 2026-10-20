import { NextResponse } from "next/server";
import { checkQuizAnswer, isPlayTrack } from "@/lib/quiz/content";
import { recordQuizAnswer } from "@/lib/quiz/record";

// POST /api/quiz/check
// Body: { date, track, questionId, choice, attemptId?, timeMs? }
// Returns whether the answer was right, the right option and the
// explanation. For signed-in players it's recorded, and the reply says
// whether this attempt is scored or practice.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { date, track, questionId, choice } = body;
  if (typeof date !== "string" || typeof track !== "string" || !isPlayTrack(track) || typeof questionId !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const result = checkQuizAnswer({ date, track, questionId, choice: Number(choice) });
  if (!result) return NextResponse.json({ error: "Question not in this set" }, { status: 404 });

  const recorded = await recordQuizAnswer({
    attemptId: body.attemptId,
    track,
    date,
    questionId,
    correct: result.correct,
    timeMs: body.timeMs,
    challengeCode: body.challengeCode,
  });

  return NextResponse.json({
    ...result,
    correct: recorded?.correct ?? result.correct,
    scored: recorded?.scored ?? null,
  });
}
