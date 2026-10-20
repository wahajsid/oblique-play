import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// "Book a free diagnostic": notes the request on the player record (synced to
// HubSpot), then opens Oblique's Calendly booking page with the player's name
// and email already filled in, tagged as coming from the game.
// Set DIAGNOSTIC_BOOKING_URL to use a different Calendly event.
// POST only, so link previews and prefetching can't record a click.
const BOOKING_URL = process.env.DIAGNOSTIC_BOOKING_URL || "https://calendly.com/alina-obliqueconsult/30min";

export async function POST() {
  const url = new URL(BOOKING_URL);
  // Calendly reads these: utm_* for reporting, name and email to prefill.
  url.searchParams.set("utm_source", "oblique-play");
  url.searchParams.set("utm_medium", "game");
  url.searchParams.set("utm_campaign", "free-diagnostic");

  if (authEnabled) {
    const player = await getSignedInPlayer();
    if (player) {
      const db = createAdminClient();
      const { data } = await db
        .from("players")
        .update({ diagnostic_clicked_at: new Date().toISOString() })
        .eq("id", player.id)
        .select("email, display_name")
        .single();
      if (data?.email) url.searchParams.set("email", data.email);
      if (data?.display_name) url.searchParams.set("name", data.display_name);
    }
  }
  return NextResponse.redirect(url, 303);
}
