import { CARD_SIZES, renderMilestoneCard, type CardSize } from "@/lib/cards";
import { getMilestone } from "@/lib/milestones";

// GET /m/<code>/card?size=landscape|square|tall: a streak card or certificate.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const m = await getMilestone(code);
  if (!m) return new Response("Not found", { status: 404 });
  const asked = new URL(request.url).searchParams.get("size") ?? "landscape";
  const size: CardSize = asked in CARD_SIZES ? (asked as CardSize) : "landscape";
  return renderMilestoneCard(m, size);
}
