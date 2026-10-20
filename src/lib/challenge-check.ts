import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
import type { PlayTrack } from "@/lib/quiz/types";

const CODE = /^[A-Za-z0-9]{8}$/;

// Checks a challenge code a game was opened with: it must exist, be for this
// exact game, and not be the player's own. Returns the code, or null.
export async function validChallengeFor(
  code: unknown,
  playerId: string,
  game: { kind: "review"; shift: number } | { kind: "quiz"; track: PlayTrack; date: string },
): Promise<string | null> {
  if (typeof code !== "string" || !CODE.test(code)) return null;
  const db = createAdminClient();
  const { data } = await db.from("challenges").select("*").eq("code", code).maybeSingle();
  if (!data || data.creator_id === playerId || data.kind !== game.kind) return null;
  if (game.kind === "review" && data.shift !== game.shift) return null;
  if (game.kind === "quiz" && (data.track !== game.track || data.set_date !== game.date)) return null;
  return code;
}
