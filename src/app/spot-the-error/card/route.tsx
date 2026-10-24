import { renderSpotCard } from "@/lib/cards";

// GET /spot-the-error/card: the page's link preview image (1200×630).
// The same for every day, so a shared link never gives the answer away.
export const runtime = "nodejs";

export async function GET() {
  return renderSpotCard();
}
