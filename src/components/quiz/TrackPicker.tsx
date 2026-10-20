"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { msUntilNextSet } from "@/lib/quiz/dates";
import { getAllQuizResults, runKey, type QuizResult } from "@/lib/quiz/progress";
import { formatTime } from "@/lib/review/progress";
import type { PlayTrack } from "@/lib/quiz/types";

type TrackInfo = { id: PlayTrack; title: string; summary: string };

function untilNext(ms: number) {
  const mins = Math.max(1, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function TrackPicker({ today, tracks }: { today: string; tracks: TrackInfo[] }) {
  // Results live on the device, so they're read after the page loads.
  const [results, setResults] = useState<Record<string, QuizResult>>({});
  const [next, setNext] = useState<number | null>(null);
  useEffect(() => {
    setResults(getAllQuizResults());
    setNext(msUntilNextSet());
    const id = window.setInterval(() => setNext(msUntilNextSet()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      <ul className="mt-6 flex flex-col gap-3">
        {tracks.map((t) => {
          const r = results[runKey(t.id, today)];
          return (
            <li key={t.id}>
              <Link
                href={`/quiz/${t.id}/${today}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-lg font-semibold">{t.title}</h2>
                  {r?.scored && (
                    <p className="text-xs font-medium text-ok">
                      Played {r.score}/{r.total} · {formatTime(r.timeMs)}
                    </p>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-muted">{t.summary}</p>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <p className="text-muted">{next !== null && <>Next set in {untilNext(next)}</>}</p>
        <Link href="/quiz/archive" className="inline-flex min-h-11 items-center font-medium underline underline-offset-2">
          Past sets
        </Link>
      </div>
    </>
  );
}
