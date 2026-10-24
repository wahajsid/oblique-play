import "server-only";

import rules from "@/content/prizes.json";
import { uaeToday } from "@/lib/quiz/dates";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

// Monthly prizes stay hidden until PRIZES_ENABLED=true is set in Vercel,
// once the rules are cleared to run (docs/PRIZES.md). Points and referrals
// are recorded either way, so turning prizes on mid-month loses nothing.
export const prizesEnabled = authEnabled && process.env.PRIZES_ENABLED === "true";

// The points rules themselves live in prize_totals() in
// supabase/migrations/20261024000001_prizes.sql; keep the two in step.
export const PRIZE_RULES = rules;

export function formatAed(amount: number): string {
  return `AED ${amount.toLocaleString("en-US")}`;
}

// "2026-11-01" for any date in November 2026.
export function monthOf(date: string): string {
  return `${date.slice(0, 8)}01`;
}

export function currentMonth(): string {
  return monthOf(uaeToday());
}

export function previousMonth(month: string): string {
  const d = new Date(`${month}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - 1);
  return d.toISOString().slice(0, 10);
}

export function lastDayOf(month: string): string {
  const d = new Date(`${month}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
}

// "November 2026"
export function monthName(month: string): string {
  return new Date(`${month}T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

export type PrizeRow = {
  rank: number;
  name: string;
  points: number;
  quizPoints: number;
  referralPoints: number;
  isMe: boolean;
};

type BoardRecord = {
  rank: number;
  name: string;
  points: number;
  quiz_points: number;
  referral_points: number;
  is_me: boolean;
};

export async function getPrizeBoard(month: string, limit = 20): Promise<PrizeRow[]> {
  if (!prizesEnabled) return [];
  const player = await getSignedInPlayer();
  const { data, error } = await createAdminClient().rpc("prize_board", {
    p_month: month,
    p_limit: limit,
    p_me: player?.id ?? null,
  });
  if (error) throw error;
  // Emails come back for the admin script; they're dropped here so they
  // can never reach the page.
  return ((data ?? []) as BoardRecord[]).map((r) => ({
    rank: Number(r.rank),
    name: r.name,
    points: Number(r.points),
    quizPoints: Number(r.quiz_points),
    referralPoints: Number(r.referral_points),
    isMe: r.is_me,
  }));
}

export type MyPrizeStatus = {
  entered: boolean;
  excluded: boolean;
  inviteCode: string;
  points: number;
  quizPoints: number;
  referralPoints: number;
  referrals: number;
  rank: number | null;
};

// The signed-in player's points this month, whether or not they've entered.
export async function getMyPrizeStatus(month: string): Promise<MyPrizeStatus | null> {
  if (!prizesEnabled) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;
  const db = createAdminClient();
  const [{ data: me }, { data: totals }, board] = await Promise.all([
    db.from("players").select("prize_entered_at, prize_excluded, invite_code").eq("id", player.id).maybeSingle(),
    db.rpc("prize_totals", { p_from: month, p_to: lastDayOf(month) }).eq("player_id", player.id).maybeSingle(),
    getPrizeBoard(month, 0),
  ]);
  if (!me) return null;
  const t = (totals ?? {}) as { points?: number; quiz_points?: number; referral_points?: number; referrals?: number };
  return {
    entered: !!me.prize_entered_at,
    excluded: me.prize_excluded,
    inviteCode: me.invite_code,
    points: Number(t.points ?? 0),
    quizPoints: Number(t.quiz_points ?? 0),
    referralPoints: Number(t.referral_points ?? 0),
    referrals: Number(t.referrals ?? 0),
    rank: board.find((r) => r.isMe)?.rank ?? null,
  };
}

export type Winner = { place: number; name: string; amountAed: number; paid: boolean };

export async function getWinners(month: string): Promise<Winner[]> {
  if (!prizesEnabled) return [];
  const { data } = await createAdminClient()
    .from("prize_awards")
    .select("place, board_name, amount_aed, status")
    .eq("month", month)
    .neq("status", "forfeited")
    .order("place");
  return (data ?? []).map((w) => ({ place: w.place, name: w.board_name, amountAed: w.amount_aed, paid: w.status === "paid" }));
}
