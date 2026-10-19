import "server-only";

import { createClient, getSignedInPlayer } from "@/lib/supabase/server";

export type PlayerRole = "business_owner" | "finance_professional" | "student";

export type PlayerProfile = {
  email: string;
  displayName: string | null;
  anonymousName: string;
  leaderboardMode: "name" | "anonymous";
  role: PlayerRole | null;
};

// The signed-in player's profile, or null if signed out or not set up yet.
export async function getProfile(): Promise<PlayerProfile | null> {
  const player = await getSignedInPlayer();
  if (!player) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("email, display_name, anonymous_name, leaderboard_mode, role")
    .eq("id", player.id)
    .maybeSingle();
  if (!data) return null;
  return {
    email: data.email,
    displayName: data.display_name,
    anonymousName: data.anonymous_name,
    leaderboardMode: data.leaderboard_mode,
    role: data.role,
  };
}
