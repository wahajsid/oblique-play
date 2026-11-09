import "server-only";

import { createClient, getSignedInPlayer } from "@/lib/supabase/server";

export type PlayerRole = "business_owner" | "finance_professional" | "student";

export type PlayerProfile = {
  email: string;
  displayName: string | null;
  company: string | null;
  anonymousName: string;
  leaderboardMode: "name" | "anonymous";
  role: PlayerRole | null;
  marketingConsent: boolean;
};

// The signed-in player's profile, or null if signed out or not set up yet.
export async function getProfile(): Promise<PlayerProfile | null> {
  const player = await getSignedInPlayer();
  if (!player) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("email, display_name, company, anonymous_name, leaderboard_mode, role, marketing_consent")
    .eq("id", player.id)
    .maybeSingle();
  if (!data) return null;
  return {
    email: data.email,
    displayName: data.display_name,
    company: data.company,
    anonymousName: data.anonymous_name,
    leaderboardMode: data.leaderboard_mode,
    role: data.role,
    marketingConsent: data.marketing_consent,
  };
}

export type PlayerStats = { streak: number; shiftsCompleted: number };

// Streak and shifts completed, read after a round finishes so the results
// screen can offer a streak card or the certificate.
export async function getPlayerStats(): Promise<PlayerStats | null> {
  const player = await getSignedInPlayer();
  if (!player) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("players").select("current_streak, shifts_completed").eq("id", player.id).maybeSingle();
  return data ? { streak: data.current_streak, shiftsCompleted: data.shifts_completed } : null;
}
