import "server-only";

import { unstable_cache } from "next/cache";
import { currentMonth, lastDayOf, prizesRunning } from "@/lib/prizes";
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

export type TopRow = { rank: number; name: string; points: number };
export type MonthlyTop = { board: "prizes" | "quiz"; rows: TopRow[] };

type TotalsRecord = { player_id: string; quiz_points: number; time_ms: number; rounds: number };

// Standard competition ranking: equal scores share a rank (1, 2, 2, 4).
function rankRows<T>(rows: T[], same: (a: T, b: T) => boolean): (T & { rank: number })[] {
  let rank = 0;
  return rows.map((r, i) => {
    if (i === 0 || !same(rows[i - 1], r)) rank = i + 1;
    return { ...r, rank };
  });
}

// This month's top players for the website's leaderboard box. In a prize month,
// it's the prize board (entered players, quiz + referral points). Otherwise
// it's Corporate Tax + VAT quiz points for everyone. Oblique staff and
// reviewers never appear. Players show under the name they chose.
async function loadMonthlyTop(month: string, limit: number): Promise<MonthlyTop> {
  const db = createAdminClient();
  if (prizesRunning()) {
    const { data, error } = await db.rpc("prize_board", { p_month: month, p_limit: limit, p_me: null });
    if (error) throw error;
    const rows = (data ?? []) as { rank: number; name: string; points: number }[];
    return { board: "prizes", rows: rows.slice(0, limit).map((r) => ({ rank: Number(r.rank), name: r.name, points: Number(r.points) })) };
  }
  const { data, error } = await db.rpc("prize_totals", { p_from: month, p_to: lastDayOf(month) }).gt("rounds", 0);
  if (error) throw error;
  const totals = ((data ?? []) as TotalsRecord[])
    .map((t) => ({ id: t.player_id, points: Number(t.quiz_points), timeMs: Number(t.time_ms) }))
    .sort((a, b) => b.points - a.points || a.timeMs - b.timeMs);
  if (!totals.length) return { board: "quiz", rows: [] };
  // Look up names for a few more than needed, in case some are staff.
  const { data: players } = await db
    .from("players")
    .select("id, display_name, anonymous_name, leaderboard_mode, prize_excluded")
    .in("id", totals.slice(0, limit + 20).map((t) => t.id));
  const byId = new Map((players ?? []).map((p) => [p.id, p]));
  const shown = totals
    .filter((t) => byId.has(t.id) && !byId.get(t.id)!.prize_excluded)
    .map((t) => {
      const p = byId.get(t.id)!;
      return { ...t, name: p.leaderboard_mode === "name" && p.display_name ? p.display_name : p.anonymous_name };
    });
  const ranked = rankRows(shown, (a, b) => a.points === b.points && a.timeMs === b.timeMs);
  return { board: "quiz", rows: ranked.slice(0, limit).map((r) => ({ rank: r.rank, name: r.name, points: r.points })) };
}

export function getMonthlyTop(limit = 5): Promise<MonthlyTop> {
  const month = currentMonth();
  return unstable_cache(() => loadMonthlyTop(month, limit), ["monthly-top", month, String(limit), String(prizesRunning())], {
    revalidate: 300,
  })();
}
