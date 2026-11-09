import { NextResponse } from "next/server";
import { getDailySet, getPlayIds, isPlayTrack } from "@/lib/quiz/content";
import { markQuestionShown } from "@/lib/quiz/record";

// POST /api/quiz/shown
// Body: { date, track, questionId, attemptId, challengeCode? }
// The game calls this when a question appears on the player's screen. It
// starts the attempt on its first question, and starts that question's
// clock on the server.
const STATUS = { signin: 401, locked: 403, attempt: 409 } as const;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { date, track, questionId } = body;
  if (typeof date !== "string" || typeof track !== "string" || !isPlayTrack(track) || typeof questionId !== "string") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const day = getDailySet(date);
  if (!day || !getPlayIds(day, track).includes(questionId)) {
    return NextResponse.json({ error: "Question not in this set" }, { status: 404 });
  }
  const shown = await markQuestionShown({ attemptId: body.attemptId, track, date, questionId, challengeCode: body.challengeCode });
  if ("blocked" in shown) return NextResponse.json({ error: shown.blocked }, { status: STATUS[shown.blocked] });
  return NextResponse.json(shown);
}
