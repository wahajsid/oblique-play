import { NextResponse } from "next/server";
import { getDailySet, getPlayIds, isPlayTrack } from "@/lib/quiz/content";
import { finishQuizAttempt } from "@/lib/quiz/record";

// POST /api/quiz/finish
// Body: { attemptId, date, track }
// Marks a signed-in player's attempt complete, scored from the server's records.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const { date, track } = body;
  if (typeof date !== "string" || typeof track !== "string" || !isPlayTrack(track)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const day = getDailySet(date);
  if (!day) return NextResponse.json({ error: "No set for that date" }, { status: 404 });

  const result = await finishQuizAttempt(body.attemptId, getPlayIds(day, track).length);
  return NextResponse.json({ recorded: !!result, ...result });
}
