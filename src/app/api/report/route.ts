import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { isQuestionId } from "@/lib/quiz/content";
import { getFullDocument } from "@/lib/review/content";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// POST /api/report
// Body: { itemId, kind: "question" | "document", reason, comment?, email?, page?, website? }
// "Report a problem with this answer". Anyone can send one, signed in or not.
// Reports are read with `npm run reports` (docs/REPORTS.md).

const REASONS = ["wrong_answer", "out_of_date", "unclear", "other"] as const;
const PER_HOUR = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  // A hidden field that people never see or fill in. Automated spam does.
  if (text(body.website, 200)) return NextResponse.json({ ok: true });

  const itemId = text(body.itemId, 40);
  const kind = body.kind === "question" || body.kind === "document" ? body.kind : null;
  const reason = REASONS.find((r) => r === body.reason);
  const exists = kind === "question" ? isQuestionId(itemId) : kind === "document" ? !!getFullDocument(itemId) : false;
  if (!kind || !reason || !exists) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const comment = text(body.comment, 1000);
  const email = text(body.email, 200).toLowerCase();
  if (email && !EMAIL.test(email)) return NextResponse.json({ error: "Please check the email address." }, { status: 400 });
  if (reason === "other" && !comment) {
    return NextResponse.json({ error: "Please tell us what's wrong." }, { status: 400 });
  }
  if (!authEnabled) return NextResponse.json({ error: "Reporting isn't available right now." }, { status: 503 });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "";
  const ipHash = ip ? createHash("sha256").update(`${ip}:${process.env.SUPABASE_SECRET_KEY ?? ""}`).digest("hex").slice(0, 32) : null;
  const player = await getSignedInPlayer();
  const db = createAdminClient();

  if (ipHash) {
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await db.from("content_reports").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo);
    if ((count ?? 0) >= PER_HOUR) {
      return NextResponse.json({ error: "Thanks, we've had a lot of reports from you just now. Please try again later." }, { status: 429 });
    }
  }
  // The same person reporting the same item again within a day: thank them, store nothing new.
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const sender = player ? `player_id.eq.${player.id}` : ipHash ? `ip_hash.eq.${ipHash}` : null;
  if (sender) {
    const { count } = await db.from("content_reports").select("id", { count: "exact", head: true }).eq("item_id", itemId).gte("created_at", dayAgo).or(sender);
    if ((count ?? 0) > 0) return NextResponse.json({ ok: true });
  }

  const { error } = await db.from("content_reports").insert({
    item_id: itemId,
    item_kind: kind,
    reason,
    comment: comment || null,
    contact_email: player ? null : email || null,
    player_id: player?.id ?? null,
    page: text(body.page, 200) || null,
    ip_hash: ipHash,
  });
  if (error) return NextResponse.json({ error: "Couldn't send that just now. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
