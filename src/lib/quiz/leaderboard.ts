import "server-only";

import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";
import { uaeToday } from "./dates";
import type { PlayTrack } from "./types";

export type BoardRow = { rank: number; name: string; score: number; timeMs: number; rounds: number; isMe: boolean };
export type Period = "today" | "month";

// Scored rounds only. Today: that day's set. Month: every scored round so
// far this month (UAE calendar), so turning up daily counts.
export async function getLeaderboard(track: PlayTrack, period: Period): Promise<BoardRow[] | null> {
  if (!authEnabled) return null;
  const today = uaeToday();
  const from = period === "today" ? today : `${today.slice(0, 8)}01`;
  const player = await getSignedInPlayer();
  const { data, error } = await createAdminClient().rpc("quiz_leaderboard", {
    p_track: track,
    p_from: from,
    p_to: today,
    p_limit: 20,
    p_me: player?.id ?? null,
  });
  if (error) throw error;
  return (data ?? []).map((r: { rank: number; name: string; score: number; time_ms: number; rounds: number; is_me: boolean }) => ({
    rank: Number(r.rank),
    name: r.name,
    score: Number(r.score),
    timeMs: Number(r.time_ms),
    rounds: Number(r.rounds),
    isMe: r.is_me,
  }));
}
