import "server-only";

import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";
import { uaeToday } from "./dates";
import type { PlayTrack } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TIME_MS = 30 * 60 * 1000;
type Db = ReturnType<typeof createAdminClient>;

// Records a signed-in player's quiz answer and says whether the attempt is
// scored. The first answer to each question in an attempt is the one that
// counts. Returns null when nothing was recorded (signed out, or sign-in off).
export async function recordQuizAnswer(input: {
  attemptId: unknown;
  track: PlayTrack;
  date: string;
  questionId: string;
  correct: boolean;
  timeMs: unknown;
}): Promise<{ correct: boolean; scored: boolean } | null> {
  if (!authEnabled || typeof input.attemptId !== "string" || !UUID.test(input.attemptId)) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;

  const db = createAdminClient();
  const attempt = await ensureAttempt(db, input.attemptId, player.id, input.track, input.date);
  if (!attempt) return null;

  const timeMs = Math.min(MAX_TIME_MS, Math.max(0, Math.round(Number(input.timeMs) || 0)));
  const { error } = await db
    .from("quiz_answers")
    .insert({ attempt_id: input.attemptId, question_id: input.questionId, correct: input.correct, time_ms: timeMs });

  if (error?.code === "23505") {
    const { data } = await db
      .from("quiz_answers")
      .select("correct")
      .eq("attempt_id", input.attemptId)
      .eq("question_id", input.questionId)
      .single();
    return data ? { correct: data.correct, scored: attempt.scored } : null;
  }
  if (error) throw error;
  return { correct: input.correct, scored: attempt.scored };
}

// Marks an attempt complete, scoring it from the stored answers.
export async function finishQuizAttempt(attemptId: unknown, total: number) {
  if (!authEnabled || typeof attemptId !== "string" || !UUID.test(attemptId)) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;

  const db = createAdminClient();
  const { data: answers, error } = await db
    .from("quiz_answers")
    .select("correct, time_ms, quiz_attempts!inner(player_id)")
    .eq("attempt_id", attemptId)
    .eq("quiz_attempts.player_id", player.id);
  if (error) throw error;
  if (!answers || answers.length < total) return null;

  const score = answers.filter((a) => a.correct).length;
  const timeMs = answers.reduce((sum, a) => sum + a.time_ms, 0);
  const { data: updated } = await db
    .from("quiz_attempts")
    .update({ completed_at: new Date().toISOString(), score, total, time_ms: timeMs })
    .eq("id", attemptId)
    .eq("player_id", player.id)
    .is("completed_at", null)
    .select("scored")
    .maybeSingle();
  return { score, total, timeMs, scored: updated?.scored ?? false };
}

// Today's set, first time on this track: scored. Anything else: practice.
async function ensureAttempt(db: Db, id: string, playerId: string, track: PlayTrack, date: string) {
  const { data: existing } = await db
    .from("quiz_attempts")
    .select("player_id, track, set_date, scored, completed_at")
    .eq("id", id)
    .maybeSingle();
  if (existing) {
    const same = existing.player_id === playerId && existing.track === track && existing.set_date === date;
    return same && !existing.completed_at ? existing : null;
  }

  const row = { id, player_id: playerId, track, set_date: date };
  if (date === uaeToday()) {
    const { error } = await db.from("quiz_attempts").insert({ ...row, scored: true });
    if (!error) return { scored: true };
    // 23505 here means a scored attempt for today already exists (or this id
    // was just inserted by a parallel request): fall through to practice.
    if (error.code !== "23505") throw error;
    const { data: raced } = await db.from("quiz_attempts").select("player_id, scored").eq("id", id).maybeSingle();
    if (raced) return raced.player_id === playerId ? { scored: raced.scored } : null;
  }
  const { error } = await db.from("quiz_attempts").insert({ ...row, scored: false });
  if (error && error.code !== "23505") throw error;
  return { scored: false };
}

// For the intro screen: has this player used today's scored round on this
// track, perhaps on another device?
export async function getScoredState(track: PlayTrack, date: string): Promise<"none" | "started" | "finished"> {
  if (!authEnabled || date !== uaeToday()) return "none";
  const player = await getSignedInPlayer();
  if (!player) return "none";
  const db = createAdminClient();
  const { data } = await db
    .from("quiz_attempts")
    .select("completed_at")
    .eq("player_id", player.id)
    .eq("track", track)
    .eq("set_date", date)
    .eq("scored", true)
    .maybeSingle();
  if (!data) return "none";
  return data.completed_at ? "finished" : "started";
}
