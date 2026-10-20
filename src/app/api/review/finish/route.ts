import { NextResponse } from "next/server";
import { getPlayerStats } from "@/lib/players";
import { getShiftDocuments } from "@/lib/review/content";
import { finishAttempt } from "@/lib/review/record";

// POST /api/review/finish
// Body: { attemptId, shift }
// Marks a signed-in player's attempt complete. The score is worked out on the
// server from the recorded answers.
export async function POST(request: Request) {
  let body: { attemptId?: unknown; shift?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const total = getShiftDocuments(Number(body.shift)).length;
  if (!total) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const result = await finishAttempt(body.attemptId, total);
  // Streak and shifts completed after this round, for milestone offers.
  const stats = result ? await getPlayerStats() : null;
  return NextResponse.json({ recorded: !!result, ...result, stats });
}
