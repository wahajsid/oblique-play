"use server";

import { createClient, getSignedInPlayer } from "@/lib/supabase/server";

const ROLES = ["business_owner", "finance_professional", "student"] as const;

// Saves the optional details asked for after a player's first round.
// The database only lets a player change their own name, role and
// leaderboard choice, so this can't touch anything else.
export async function saveProfile(input: {
  displayName: string;
  company?: string;
  role: string | null;
  leaderboardMode: "name" | "anonymous";
  // Only sent from the profile page; omitted after the first round.
  marketing?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const player = await getSignedInPlayer();
  if (!player) return { ok: false, error: "Please sign in again." };

  const displayName = input.displayName.trim().replace(/\s+/g, " ").slice(0, 40) || null;
  const role = ROLES.find((r) => r === input.role) ?? null;
  const company = typeof input.company === "string" ? input.company.trim().replace(/\s+/g, " ").slice(0, 80) || null : undefined;
  // Showing a name on the leaderboard needs a name to show.
  const leaderboardMode = input.leaderboardMode === "name" && displayName ? "name" : "anonymous";

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({
      display_name: displayName,
      ...(company !== undefined ? { company } : {}),
      role,
      leaderboard_mode: leaderboardMode,
      ...(typeof input.marketing === "boolean" ? { marketing_consent: input.marketing } : {}),
    })
    .eq("id", player.id);
  return error ? { ok: false, error: "Couldn't save just now. Please try again." } : { ok: true };
}
