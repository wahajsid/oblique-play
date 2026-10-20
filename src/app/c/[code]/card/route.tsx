import { CARD_SIZES, renderChallengeCard, type CardSize } from "@/lib/cards";
import { getChallenge } from "@/lib/challenges";

// GET /c/<code>/card?size=landscape|square|tall  (landscape by default)
// The challenge's share card as a PNG. Link previews on LinkedIn and
// WhatsApp use the landscape one.
export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const challenge = await getChallenge(code);
  if (!challenge) return new Response("Not found", { status: 404 });
  const asked = new URL(request.url).searchParams.get("size") ?? "landscape";
  const size: CardSize = asked in CARD_SIZES ? (asked as CardSize) : "landscape";
  return renderChallengeCard(challenge, size);
}
