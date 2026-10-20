import "server-only";

import shiftsData from "@/content/review/shifts.json";
import { longDate } from "@/lib/quiz/dates";
import { finishQuizAttempt } from "@/lib/quiz/record";
import { finishAttempt } from "@/lib/review/record";
import { getDailySet, getPlayIds, isPlayTrack, TRACKS } from "@/lib/quiz/content";
import { getShiftDocuments } from "@/lib/review/content";
import { newCode } from "@/lib/milestones";
import { authEnabled, siteUrl } from "@/lib/supabase/config";
import { createAdminClient, getSignedInPlayer } from "@/lib/supabase/server";
import type { PlayTrack } from "@/lib/quiz/types";

export type ChallengeKind = "review" | "quiz";

export type Challenge = {
  code: string;
  creatorId: string;
  creatorName: string | null;
  kind: ChallengeKind;
  shift: number | null;
  track: PlayTrack | null;
  setDate: string | null;
  score: number;
  total: number;
  timeMs: number;
  replyTo: Challenge | null;
};

type Row = {
  code: string;
  creator_id: string;
  creator_name: string | null;
  kind: ChallengeKind;
  shift: number | null;
  track: PlayTrack | null;
  set_date: string | null;
  score: number;
  total: number;
  time_ms: number;
  reply_to: string | null;
};

const CODE = /^[A-Za-z0-9]{8}$/;
const shifts = shiftsData as { number: number; title: string }[];

const toChallenge = (r: Row, replyTo: Challenge | null = null): Challenge => ({
  code: r.code,
  creatorId: r.creator_id,
  creatorName: r.creator_name,
  kind: r.kind,
  shift: r.shift,
  track: r.track,
  setDate: r.set_date,
  score: r.score,
  total: r.total,
  timeMs: r.time_ms,
  replyTo,
});

export const displayName = (c: Pick<Challenge, "creatorName">) => c.creatorName || "A friend";
export const challengeUrl = (code: string) => `${siteUrl}/c/${code}`;

// For sentences: "on Shift 1: Tax invoice basics", "on the 20 Oct 2026 VAT quiz".
export const onLabel = (c: Pick<Challenge, "kind" | "shift" | "track" | "setDate">) =>
  `${c.kind === "quiz" ? "the " : ""}${challengeLabel(c)}`;

// "Shift 1: Tax invoice basics" or "20 Oct 2026 VAT quiz"
export function challengeLabel(c: Pick<Challenge, "kind" | "shift" | "track" | "setDate">): string {
  if (c.kind === "review") return `Shift ${c.shift}: ${shifts.find((s) => s.number === c.shift)?.title ?? ""}`;
  const name = c.track === "both" ? "Corporate Tax and VAT" : TRACKS[c.track!].title;
  return `${longDate(c.setDate!)} ${name} quiz`;
}

// Where the friend plays: the same shift, or the same day's set, in the same order.
export function challengeGamePath(c: Challenge): string {
  return c.kind === "review" ? `/review/${c.shift}?c=${c.code}` : `/quiz/${c.track}/${c.setDate}?c=${c.code}`;
}

// The challenge a game page was opened with (?c=CODE), if it's for this exact
// game and not the player's own.
export async function challengeInfoFor(
  code: string | undefined,
  playerId: string | null,
  game: { kind: "review"; shift: number } | { kind: "quiz"; track: PlayTrack; date: string },
): Promise<{ code: string; name: string; score: number; total: number; timeMs: number } | null> {
  if (!code) return null;
  const c = await getChallenge(code);
  if (!c || c.kind !== game.kind || c.creatorId === playerId) return null;
  if (game.kind === "review" && c.shift !== game.shift) return null;
  if (game.kind === "quiz" && (c.track !== game.track || c.setDate !== game.date)) return null;
  return { code: c.code, name: displayName(c), score: c.score, total: c.total, timeMs: c.timeMs };
}

export async function getChallenge(code: string): Promise<Challenge | null> {
  if (!authEnabled || !CODE.test(code)) return null;
  const db = createAdminClient();
  const { data } = await db.from("challenges").select("*").eq("code", code).maybeSingle<Row>();
  if (!data) return null;
  let replyTo: Challenge | null = null;
  if (data.reply_to) {
    const { data: parent } = await db.from("challenges").select("*").eq("code", data.reply_to).maybeSingle<Row>();
    if (parent) replyTo = toChallenge(parent);
  }
  return toChallenge(data, replyTo);
}

// Makes (or reuses) the challenge for one of the signed-in player's finished
// attempts. The score always comes from the server's own records.
export async function createChallenge(input: {
  kind: ChallengeKind;
  attemptId: unknown;
  name?: unknown;
}): Promise<{ code: string } | { error: string }> {
  if (!authEnabled) return { error: "Challenges need sign-in" };
  const player = await getSignedInPlayer();
  if (!player) return { error: "Please sign in again" };
  if (typeof input.attemptId !== "string") return { error: "Invalid request" };
  const db = createAdminClient();

  const table = input.kind === "review" ? "review_attempts" : "quiz_attempts";
  const load = async () => (await db.from(table).select("*").eq("id", input.attemptId).maybeSingle()).data;
  let attempt = await load();
  if (!attempt || attempt.player_id !== player.id) return { error: "Result not found" };

  // The finish call from the results screen may still be on its way.
  if (!attempt.completed_at) {
    const finished =
      input.kind === "review"
        ? await finishAttempt(attempt.id, getShiftDocuments(attempt.shift).length)
        : await finishQuizAttempt(attempt.id, quizTotal(attempt.track, attempt.set_date));
    attempt = await load();
    if (!finished || !attempt?.completed_at) return { error: "Finish the round first" };
  }

  const name = await nameForCard(db, player.id, input.name);
  const { data: existing } = await db.from("challenges").select("code").eq("attempt_id", attempt.id).maybeSingle();
  if (existing) {
    if (name !== undefined) await db.from("challenges").update({ creator_name: name }).eq("code", existing.code);
    return { code: existing.code };
  }

  const row = {
    creator_id: player.id,
    creator_name: name ?? null,
    kind: input.kind,
    shift: input.kind === "review" ? attempt.shift : null,
    track: input.kind === "quiz" ? attempt.track : null,
    set_date: input.kind === "quiz" ? attempt.set_date : null,
    attempt_id: attempt.id,
    score: attempt.score,
    total: attempt.total,
    time_ms: (input.kind === "review" ? attempt.desk_ms : attempt.time_ms) ?? 0,
    // A round played from someone's challenge becomes the rematch.
    reply_to: attempt.challenge_code ?? null,
  };
  for (let tries = 0; tries < 5; tries++) {
    const code = newCode();
    const { error } = await db.from("challenges").insert({ code, ...row });
    if (!error) return { code };
    if (error.code !== "23505") throw error;
    // A clash on attempt_id means a parallel request made it: reuse that one.
    const { data: raced } = await db.from("challenges").select("code").eq("attempt_id", attempt.id).maybeSingle();
    if (raced) return { code: raced.code };
  }
  return { error: "Couldn't make a link just now" };
}

function quizTotal(track: string, date: string): number {
  const day = getDailySet(date);
  return day && isPlayTrack(track) ? getPlayIds(day, track).length : 20;
}

// The name on the card: one typed in now (also saved as the display name if
// the player hasn't set one), otherwise their display name.
async function nameForCard(db: ReturnType<typeof createAdminClient>, playerId: string, typed: unknown) {
  const { data: p } = await db.from("players").select("display_name").eq("id", playerId).single();
  if (typeof typed === "string" && typed.trim()) {
    const name = typed.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!p?.display_name) await db.from("players").update({ display_name: name }).eq("id", playerId);
    return name;
  }
  return typed === undefined ? (p?.display_name ?? undefined) : undefined;
}
