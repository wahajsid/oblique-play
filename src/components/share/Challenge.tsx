import { formatTime } from "@/lib/review/progress";

// What a game needs to know about the challenge it was opened from.
export type ChallengeInfo = { code: string; name: string; score: number; total: number; timeMs: number };

export function ChallengeBanner({ challenge }: { challenge: ChallengeInfo }) {
  return (
    <p className="mt-4 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
      <span className="font-semibold">{challenge.name}</span> scored{" "}
      <span className="font-semibold">
        {challenge.score}/{challenge.total}
      </span>{" "}
      in {formatTime(challenge.timeMs)}. Same questions, same order. Your turn.
    </p>
  );
}

// Higher score wins; on a tie, the faster time.
export function challengeOutcome(you: { score: number; timeMs: number }, them: ChallengeInfo): "win" | "lose" | "tie" {
  if (you.score !== them.score) return you.score > them.score ? "win" : "lose";
  if (Math.round(you.timeMs / 1000) !== Math.round(them.timeMs / 1000)) return you.timeMs < them.timeMs ? "win" : "lose";
  return "tie";
}

export function ChallengeResult({ you, them }: { you: { score: number; total: number; timeMs: number }; them: ChallengeInfo }) {
  const outcome = challengeOutcome(you, them);
  const verdict =
    outcome === "win"
      ? `You beat ${them.name}.`
      : outcome === "lose"
        ? `${them.name} takes this one.`
        : "Dead heat.";
  const timeDecided = you.score === them.score && outcome !== "tie";
  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4" aria-labelledby="vs-title">
      <h2 id="vs-title" className="text-lg font-semibold">
        {verdict}
      </h2>
      {timeDecided && <p className="text-sm text-muted">Same score, so time decided it.</p>}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        {[
          { label: "You", ...you, lead: outcome === "win" },
          { label: them.name, ...them, lead: outcome === "lose" },
        ].map((p) => (
          <div key={p.label} className={`rounded-xl border px-2 py-3 ${p.lead ? "border-ok bg-ok-soft" : "border-line"}`}>
            <p className="truncate text-xs font-medium text-muted">{p.label}</p>
            <p className="text-2xl font-semibold tabular-nums">
              {p.score}/{p.total}
            </p>
            <p className="text-xs text-muted tabular-nums">{formatTime(p.timeMs)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// The message that goes with a share or a rematch.
export function shareMessage(opts: {
  score: number;
  total: number;
  what: string; // e.g. "today's UAE VAT quiz" or "Shift 1 (Tax invoice basics) of Oblique's UAE tax game"
  challenge?: ChallengeInfo | null;
}): string {
  const { score, total, what, challenge } = opts;
  if (!challenge) return `I scored ${score}/${total} on ${what}. Can you beat me?`;
  return `I scored ${score}/${total} against your ${challenge.score}/${challenge.total} on ${what}. Your move.`;
}
