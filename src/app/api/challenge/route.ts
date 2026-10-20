import { NextResponse } from "next/server";
import { challengeUrl, createChallenge } from "@/lib/challenges";

// POST /api/challenge
// Body: { kind: "review" | "quiz", attemptId, name? }
// Makes (or reuses) the challenge link for one of the signed-in player's
// finished rounds. The score comes from the server's records, not the body.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.kind !== "review" && body.kind !== "quiz") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await createChallenge({ kind: body.kind, attemptId: body.attemptId, name: body.name });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ code: result.code, url: challengeUrl(result.code) });
}
