import "server-only";

import { validChallengeFor } from "@/lib/challenge-check";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";
import { weakTopicLabel } from "./content";
import { uaeToday } from "./dates";
import type { PlayTrack } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TIME_MS = 30 * 60 * 1000;
type Db = ReturnType<typeof createAdminClient>;

// Why an answer or a question can't be taken:
//   signin   nobody is signed in
//   locked   the mixed quiz, before today's Corporate Tax and VAT scored rounds are done
//   attempt  the attempt id is malformed, finished, or someone else's
export type Blocked = { blocked: "signin" | "locked" | "attempt" };
type Attempt = { id: string; scored: boolean };

type Round = {
  attemptId: unknown;
  track: PlayTrack;
  date: string;
  questionId: string;
  // The challenge link this round was opened from, if any.
  challengeCode?: unknown;
};

// Fair play rules, all enforced here on the server:
//   1. An answer is only revealed after it has been stored against the
//      player's own attempt, so nobody can look answers up first.
//   2. Today's first attempt on a track is the scored one. Until it's
//      finished there is no practice round of the same set to peek through:
//      a new attempt id (say, from a second device) carries on the scored round.
//   3. The mixed quiz reuses today's Corporate Tax and VAT questions, so
//      today's mixed quiz opens only after both scored rounds are finished.
//   4. Time is measured here, from when a question was shown to when its
//      answer arrived. The player's device isn't asked.

// Notes that a question is now on the player's screen. Starts the attempt
// if this is its first question.
export async function markQuestionShown(input: Round): Promise<{ attemptId: string; scored: boolean } | Blocked> {
  const opened = await openAttempt(input);
  if ("blocked" in opened) return opened;
  const { db, attempt } = opened;

  const { data: answered } = await db
    .from("quiz_answers")
    .select("question_id")
    .eq("attempt_id", attempt.id)
    .eq("question_id", input.questionId)
    .maybeSingle();
  if (!answered) {
    // Showing the same question again (a reload, say) doesn't restart its clock.
    await db
      .from("quiz_attempts")
      .update({ shown_question_id: input.questionId, shown_at: new Date().toISOString() })
      .eq("id", attempt.id)
      .or(`shown_question_id.is.null,shown_question_id.neq.${input.questionId}`);
  }
  return { attemptId: attempt.id, scored: attempt.scored };
}

// Stores a signed-in player's answer and says whether the attempt is scored.
// The first answer to each question in an attempt is the one that counts.
export async function recordQuizAnswer(
  input: Round & { correct: boolean },
): Promise<{ correct: boolean; scored: boolean; attemptId: string } | Blocked> {
  const opened = await openAttempt(input);
  if ("blocked" in opened) return opened;
  const { db, attempt } = opened;

  const { error } = await db
    .from("quiz_answers")
    .insert({ attempt_id: attempt.id, question_id: input.questionId, correct: input.correct, time_ms: await timeTaken(db, attempt.id, input.questionId) });

  if (error?.code === "23505") {
    const { data } = await db
      .from("quiz_answers")
      .select("correct")
      .eq("attempt_id", attempt.id)
      .eq("question_id", input.questionId)
      .single();
    return data ? { correct: data.correct, scored: attempt.scored, attemptId: attempt.id } : { blocked: "attempt" };
  }
  if (error) throw error;
  return { correct: input.correct, scored: attempt.scored, attemptId: attempt.id };
}

// Milliseconds from when the question was shown to now. If the device never
// said it was shown, the clock runs from the previous answer (or the start
// of the attempt), which can only be longer.
async function timeTaken(db: Db, attemptId: string, questionId: string): Promise<number> {
  const { data: attempt } = await db
    .from("quiz_attempts")
    .select("shown_question_id, shown_at, started_at")
    .eq("id", attemptId)
    .single();
  let from: string | null = attempt?.shown_question_id === questionId ? attempt.shown_at : null;
  if (!from) {
    const { data: last } = await db
      .from("quiz_answers")
      .select("answered_at")
      .eq("attempt_id", attemptId)
      .order("answered_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    from = last?.answered_at ?? attempt?.started_at ?? null;
  }
  const ms = from ? Date.now() - Date.parse(from) : MAX_TIME_MS;
  return Math.min(MAX_TIME_MS, Math.max(0, Math.round(ms)));
}

// Marks an attempt complete, scoring it from the stored answers.
export async function finishQuizAttempt(attemptId: unknown, total: number) {
  if (!authEnabled || typeof attemptId !== "string" || !UUID.test(attemptId)) return null;
  const player = await getSignedInPlayer();
  if (!player) return null;

  const db = createAdminClient();
  const { data: answers, error } = await db
    .from("quiz_answers")
    .select("question_id, correct, time_ms, quiz_attempts!inner(player_id)")
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
  // The topic this round went worst on, for a specific follow-up in HubSpot.
  // A round with no weak topic leaves the last one in place.
  const weak = weakTopicLabel(answers);
  if (updated && weak) await db.from("players").update({ weak_topic: weak }).eq("id", player.id);
  return { score, total, timeMs, scored: updated?.scored ?? false };
}

async function openAttempt(input: Round): Promise<{ db: Db; attempt: Attempt } | Blocked> {
  if (!authEnabled) return { blocked: "signin" };
  const player = await getSignedInPlayer();
  if (!player) return { blocked: "signin" };
  if (typeof input.attemptId !== "string" || !UUID.test(input.attemptId)) return { blocked: "attempt" };
  const db = createAdminClient();
  const attempt = await ensureAttempt(db, input.attemptId, player.id, input.track, input.date, input.challengeCode);
  return "blocked" in attempt ? attempt : { db, attempt };
}

async function scoredAttemptToday(db: Db, playerId: string, track: PlayTrack, date: string) {
  const { data } = await db
    .from("quiz_attempts")
    .select("id, completed_at")
    .eq("player_id", playerId)
    .eq("track", track)
    .eq("set_date", date)
    .eq("scored", true)
    .maybeSingle();
  return data;
}

// Has the player finished today's scored Corporate Tax and VAT rounds?
async function mixedUnlocked(db: Db, playerId: string, date: string): Promise<boolean> {
  const { count } = await db
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("player_id", playerId)
    .eq("set_date", date)
    .eq("scored", true)
    .in("track", ["ct", "vat"])
    .not("completed_at", "is", null);
  return (count ?? 0) >= 2;
}

async function ensureAttempt(db: Db, id: string, playerId: string, track: PlayTrack, date: string, challengeCode: unknown): Promise<Attempt | Blocked> {
  const { data: existing } = await db
    .from("quiz_attempts")
    .select("player_id, track, set_date, scored, completed_at")
    .eq("id", id)
    .maybeSingle();
  if (existing) {
    const same = existing.player_id === playerId && existing.track === track && existing.set_date === date;
    return same && !existing.completed_at ? { id, scored: existing.scored } : { blocked: "attempt" };
  }

  const today = date === uaeToday();
  if (today && track === "both" && !(await mixedUnlocked(db, playerId, date))) return { blocked: "locked" };

  const challenge_code = await validChallengeFor(challengeCode, playerId, { kind: "quiz", track, date });
  const row = { id, player_id: playerId, track, set_date: date, challenge_code };
  if (today) {
    const open = await scoredAttemptToday(db, playerId, track, date);
    // An unfinished scored round carries on, whichever device asks.
    if (open && !open.completed_at) return { id: open.id, scored: true };
    if (!open) {
      const { error } = await db.from("quiz_attempts").insert({ ...row, scored: true });
      if (!error) return { id, scored: true };
      // 23505: a parallel request just started the scored round. Carry that one on.
      if (error.code !== "23505") throw error;
      const raced = await scoredAttemptToday(db, playerId, track, date);
      if (raced && !raced.completed_at) return { id: raced.id, scored: true };
    }
  }
  const { error } = await db.from("quiz_attempts").insert({ ...row, scored: false });
  if (error && error.code !== "23505") throw error;
  return { id, scored: false };
}

// For the intro screen: has this player used today's scored round on this
// track, perhaps on another device?
export async function getScoredState(track: PlayTrack, date: string): Promise<"none" | "started" | "finished"> {
  if (!authEnabled || date !== uaeToday()) return "none";
  const player = await getSignedInPlayer();
  if (!player) return "none";
  const data = await scoredAttemptToday(createAdminClient(), player.id, track, date);
  if (!data) return "none";
  return data.completed_at ? "finished" : "started";
}

// For the quiz hub: is today's mixed quiz open to the signed-in player?
// With sign-in off (local development) there is nothing to protect.
export async function isMixedUnlocked(date: string): Promise<boolean> {
  if (!authEnabled) return true;
  const player = await getSignedInPlayer();
  if (!player) return false;
  return mixedUnlocked(createAdminClient(), player.id, date);
}
