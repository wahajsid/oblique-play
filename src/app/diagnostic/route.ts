import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// "Book a free diagnostic": notes the request on the player record (synced to
// HubSpot), then opens Oblique's booking page. Set DIAGNOSTIC_BOOKING_URL to a
// booking link (for example a HubSpot meetings page) to send people there.
// POST only, so link previews and prefetching can't record a click.
const BOOKING_URL = process.env.DIAGNOSTIC_BOOKING_URL || "https://obliqueconsult.com/contact-us";

export async function POST() {
  if (authEnabled) {
    const player = await getSignedInPlayer();
    if (player) {
      await createAdminClient()
        .from("players")
        .update({ diagnostic_clicked_at: new Date().toISOString() })
        .eq("id", player.id);
    }
  }
  return NextResponse.redirect(BOOKING_URL, 303);
}
