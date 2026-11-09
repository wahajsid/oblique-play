import { NextResponse } from "next/server";
import { checkQuizAnswer, checkSampleAnswer, isPlayTrack } from "@/lib/quiz/content";
import { recordQuizAnswer } from "@/lib/quiz/record";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";

// POST /api/quiz/check
// Body: { date, track, questionId, choice, attemptId }  or  { sample: true, questionId, choice }
//
// Says whether the answer was right, which option is right, and why.
// The answer is only given once it has been stored against the signed-in
// player's own attempt, so nobody can look answers up before answering.
// The only exception is the five public sample questions.
const STATUS = { signin: 401, locked: 403, attempt: 409 } as const;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { date, track, questionId } = body;
  const choice = Number(body.choice);
  if (typeof questionId !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (body.sample === true) {
    const result = checkSampleAnswer(questionId, choice);
    return result ? NextResponse.json({ ...result, scored: null }) : NextResponse.json({ error: "Not a sample question" }, { status: 404 });
  }

  if (typeof date !== "string" || typeof track !== "string" || !isPlayTrack(track)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // With sign-in switched off (local development) there are no accounts or
  // scores, so answers are simply marked.
  if (!authEnabled) {
    const result = checkQuizAnswer({ date, track, questionId, choice });
    return result ? NextResponse.json({ ...result, scored: null }) : NextResponse.json({ error: "Question not in this set" }, { status: 404 });
  }

  const player = await getSignedInPlayer();
  if (!player) return NextResponse.json({ error: "signin" }, { status: 401 });
  const result = checkQuizAnswer({ date, track, questionId, choice, seed: player.id });
  if (!result) return NextResponse.json({ error: "Question not in this set" }, { status: 404 });

  const recorded = await recordQuizAnswer({
    attemptId: body.attemptId,
    track,
    date,
    questionId,
    correct: result.correct,
    challengeCode: body.challengeCode,
  });
  if ("blocked" in recorded) return NextResponse.json({ error: recorded.blocked }, { status: STATUS[recorded.blocked] });

  return NextResponse.json({ ...result, correct: recorded.correct, scored: recorded.scored, attemptId: recorded.attemptId });
}
