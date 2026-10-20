import "server-only";

import { randomInt } from "node:crypto";
import { authEnabled, siteUrl } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// Shareable milestones: streak cards at 7, 30 and 100 days, and the
// certificate for completing all six document shifts. Like challenges, the
// server makes one only after checking the player has earned it.

export const STREAK_MILESTONES = [7, 30, 100] as const;
export const ALL_SHIFTS = 6;

export type Milestone = {
  code: string;
  kind: "streak" | "certificate";
  value: number;
  name: string | null;
  createdAt: string;
};

const CODE = /^[A-Za-z0-9]{8}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const newCode = () => Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
export const milestoneUrl = (code: string) => `${siteUrl}/m/${code}`;

// The highest streak milestone reached at this streak length, if any.
export function streakMilestone(streak: number): number | null {
  return [...STREAK_MILESTONES].reverse().find((m) => streak >= m) ?? null;
}

export async function getMilestone(code: string): Promise<Milestone | null> {
  if (!authEnabled || !CODE.test(code)) return null;
  const { data } = await createAdminClient().from("milestones").select("*").eq("code", code).maybeSingle();
  return data ? { code: data.code, kind: data.kind, value: data.value, name: data.name, createdAt: data.created_at } : null;
}

export async function createMilestone(input: {
  kind: unknown;
  value: unknown;
  name?: unknown;
}): Promise<{ code: string } | { error: string }> {
  if (!authEnabled) return { error: "Needs sign-in" };
  const player = await getSignedInPlayer();
  if (!player) return { error: "Please sign in again" };
  const db = createAdminClient();
  const { data: p } = await db
    .from("players")
    .select("display_name, current_streak, shifts_completed")
    .eq("id", player.id)
    .single();
  if (!p) return { error: "Player not found" };

  // Earned?
  const value = Number(input.value);
  if (input.kind === "streak") {
    if (!STREAK_MILESTONES.includes(value as 7) || p.current_streak < value) return { error: "Not reached yet" };
  } else if (input.kind === "certificate") {
    if (value !== ALL_SHIFTS || p.shifts_completed < ALL_SHIFTS) return { error: "Not reached yet" };
  } else {
    return { error: "Invalid request" };
  }

  // A typed name also becomes the display name if there isn't one.
  let name: string | null = p.display_name;
  if (typeof input.name === "string" && input.name.trim()) {
    name = input.name.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!p.display_name) await db.from("players").update({ display_name: name }).eq("id", player.id);
  }

  const { data: existing } = await db
    .from("milestones")
    .select("code")
    .eq("player_id", player.id)
    .eq("kind", input.kind)
    .eq("value", value)
    .maybeSingle();
  if (existing) {
    if (name) await db.from("milestones").update({ name }).eq("code", existing.code);
    return { code: existing.code };
  }
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    const { error } = await db.from("milestones").insert({ code, player_id: player.id, kind: input.kind, value, name });
    if (!error) return { code };
    if (error.code !== "23505") throw error;
    const { data: raced } = await db
      .from("milestones")
      .select("code")
      .eq("player_id", player.id)
      .eq("kind", input.kind)
      .eq("value", value)
      .maybeSingle();
    if (raced) return { code: raced.code };
  }
  return { error: "Couldn't make a link just now" };
}
