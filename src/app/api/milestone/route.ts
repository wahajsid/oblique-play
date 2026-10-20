import { NextResponse } from "next/server";
import { createMilestone, milestoneUrl } from "@/lib/milestones";

// POST /api/milestone
// Body: { kind: "streak" | "certificate", value, name? }
// Makes (or reuses) the shareable link for a milestone the signed-in player
// has actually reached, checked against the server's records.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const result = await createMilestone({ kind: body.kind, value: body.value, name: body.name });
  if ("error" in result) return NextResponse.json(result, { status: 400 });
  return NextResponse.json({ code: result.code, url: milestoneUrl(result.code) });
}
