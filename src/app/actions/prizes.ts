"use server";

import { revalidatePath } from "next/cache";
import { prizesEnabled } from "@/lib/prizes";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// Entering stamps the time on the server, so nobody can backdate it.
// Players can't write these columns themselves; this runs with the secret key
// and only ever touches the signed-in player's own row.
export async function setPrizeEntry(input: { enter: boolean; confirmed?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!prizesEnabled) return { ok: false, error: "Prizes aren't running right now." };
  const player = await getSignedInPlayer();
  if (!player) return { ok: false, error: "Please sign in again." };
  if (input.enter && !input.confirmed) return { ok: false, error: "Please confirm you meet the rules first." };

  const db = createAdminClient();
  const { error } = input.enter
    ? await db
        .from("players")
        .update({ prize_entered_at: new Date().toISOString() })
        .eq("id", player.id)
        .eq("prize_excluded", false)
        .is("prize_entered_at", null)
    : await db.from("players").update({ prize_entered_at: null }).eq("id", player.id);
  if (error) return { ok: false, error: "Couldn't save just now. Please try again." };
  revalidatePath("/prizes");
  return { ok: true };
}
