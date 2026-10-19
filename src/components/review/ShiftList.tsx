"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatTime, getAllBest, type ShiftBest } from "@/lib/review/progress";
import type { ShiftInfo } from "@/lib/review/types";

export function ShiftList({ shifts }: { shifts: ShiftInfo[] }) {
  // Best scores live in the browser, so they're read after the page loads.
  const [best, setBest] = useState<Record<string, ShiftBest>>({});
  useEffect(() => setBest(getAllBest()), []);

  return (
    <ol className="mt-6 flex flex-col gap-3">
      {shifts.map((shift) => {
        const result = best[shift.number];
        const body = (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Shift {shift.number}</p>
              {result && (
                <p className="text-xs font-medium text-ok">
                  Best {result.score}/{result.total} · {formatTime(result.deskMs)}
                </p>
              )}
            </div>
            <h2 className={`mt-1 text-lg font-semibold ${shift.available ? "" : "text-muted"}`}>{shift.title}</h2>
            <p className="mt-0.5 text-sm text-muted">{shift.summary}</p>
            {!shift.available && <p className="mt-2 text-sm font-medium text-muted">Coming soon</p>}
          </>
        );
        return (
          <li key={shift.number}>
            {shift.available ? (
              <Link
                href={`/review/${shift.number}`}
                className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-accent"
              >
                {body}
              </Link>
            ) : (
              <div className="rounded-2xl border border-dashed border-line p-4">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
