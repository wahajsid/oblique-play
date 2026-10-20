import "server-only";

import { validChallengeFor } from "@/lib/challenge-check";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DESK_MS = 30 * 60 * 1000;

// Records a signed-in player's answer. The first answer to each document in
// an attempt is the one that counts; if the player answers again (say, after
// seeing the explanation), the stored result is returned instead.
// Returns null when nothing was recorded (signed out, or sign-in is off).
export async function recordAnswer(input: {
  attemptId: unknown;
  shift: number;
  docId: string;
  correct: boolean;
  deskMs: unknown;
  // The challenge link this shift was opened from, if any.
  challengeCode?: unknown;
}): Promise<{ correct: boolean } | null> {
  if (!authEnabled || typeof input.attemptId !== "string" || !UUID.test(input.attemptId)) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;

  const db = createAdminClient();
  const attempt = await ensureAttempt(db, input.attemptId, player.id, input.shift, input.challengeCode);
  if (!attempt) return null;

  const deskMs = Math.min(MAX_DESK_MS, Math.max(0, Math.round(Number(input.deskMs) || 0)));
  const { error } = await db
    .from("review_answers")
    .insert({ attempt_id: input.attemptId, doc_id: input.docId, correct: input.correct, desk_ms: deskMs });

  if (error?.code === "23505") {
    // Already answered in this attempt: the first answer stands.
    const { data } = await db
      .from("review_answers")
      .select("correct")
      .eq("attempt_id", input.attemptId)
      .eq("doc_id", input.docId)
      .single();
    return data ? { correct: data.correct } : null;
  }
  if (error) throw error;
  return { correct: input.correct };
}

// Marks an attempt complete, with the score worked out from the stored
// answers rather than anything the browser sends.
export async function finishAttempt(attemptId: unknown, total: number) {
  if (!authEnabled || typeof attemptId !== "string" || !UUID.test(attemptId)) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;

  const db = createAdminClient();
  const { data: answers, error } = await db
    .from("review_answers")
    .select("correct, desk_ms, review_attempts!inner(player_id)")
    .eq("attempt_id", attemptId)
    .eq("review_attempts.player_id", player.id);
  if (error) throw error;
  if (!answers?.length || answers.length < total) return null;

  const score = answers.filter((a) => a.correct).length;
  const deskMs = answers.reduce((sum, a) => sum + a.desk_ms, 0);
  await db
    .from("review_attempts")
    .update({ completed_at: new Date().toISOString(), score, total, desk_ms: deskMs })
    .eq("id", attemptId)
    .eq("player_id", player.id)
    .is("completed_at", null);
  return { score, total, deskMs };
}

async function ensureAttempt(
  db: ReturnType<typeof createAdminClient>,
  id: string,
  playerId: string,
  shift: number,
  challengeCode: unknown,
) {
  const { data: existing } = await db.from("review_attempts").select("player_id, shift, completed_at").eq("id", id).maybeSingle();
  if (existing) {
    // Someone else's attempt, a different shift, or already finished: don't record.
    return existing.player_id === playerId && existing.shift === shift && !existing.completed_at ? existing : null;
  }
  const challenge_code = await validChallengeFor(challengeCode, playerId, { kind: "review", shift });
  const { error } = await db.from("review_attempts").insert({ id, player_id: playerId, shift, challenge_code });
  if (error && error.code !== "23505") throw error;
  return { player_id: playerId, shift, completed_at: null };
}
