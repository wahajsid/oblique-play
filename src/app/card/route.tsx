import { renderHomeCard } from "@/lib/cards";

// GET /card: the game's link preview image (1200×630), used by every page
// that doesn't have a more specific one.
export const runtime = "nodejs";

export async function GET() {
  return renderHomeCard();
}
