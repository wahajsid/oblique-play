import { NextResponse } from "next/server";
import { checkAnswer } from "@/lib/review/content";
import type { CheckRequest } from "@/lib/review/types";

// POST /api/review/check
// Body: { docId, verdict: "right" | "off", targetId? }
// Returns whether the answer was right, plus the explanation.
export async function POST(request: Request) {
  let body: Partial<CheckRequest>;
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
  return NextResponse.json(result);
}
