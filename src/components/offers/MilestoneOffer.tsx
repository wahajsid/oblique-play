"use client";

import { useState } from "react";
import { ShareSheet } from "@/components/share/ShareSheet";
import { milestoneLink } from "@/lib/share-client";
import type { PlayerStats } from "@/lib/players";

const STREAKS = [7, 30, 100];

// After a round: offers a streak card on the day a 7, 30 or 100-day streak
// is reached, and the certificate once all six shifts are done.
export function MilestoneOffer({ stats, afterShift, hasName }: { stats: PlayerStats | null; afterShift: boolean; hasName: boolean }) {
  const [open, setOpen] = useState<"streak" | "certificate" | null>(null);
  if (!stats) return null;
  const streak = STREAKS.includes(stats.streak) ? stats.streak : null;
  const certificate = afterShift && stats.shiftsCompleted >= 6;
  if (!streak && !certificate) return null;

  return (
    <>
      {certificate && (
        <section className="mt-6 rounded-2xl border border-ok bg-ok-soft p-4">
          <h2 className="text-lg font-semibold">All six shifts done.</h2>
          <p className="mt-1 text-sm">Your certificate from Oblique is ready to post on LinkedIn.</p>
          <button type="button" onClick={() => setOpen("certificate")} className="mt-3 min-h-12 w-full rounded-full btn-primary text-base font-semibold">
            Get your certificate
          </button>
        </section>
      )}
      {streak && (
        <section className="mt-6 rounded-2xl border border-ok bg-ok-soft p-4">
          <h2 className="text-lg font-semibold">{streak} days in a row.</h2>
          <p className="mt-1 text-sm">That&apos;s a habit. Share your streak card.</p>
          <button type="button" onClick={() => setOpen("streak")} className="mt-3 min-h-12 w-full rounded-full btn-primary text-base font-semibold">
            Share my streak
          </button>
        </section>
      )}
      {open && (
        <ShareSheet
          create={open === "certificate" ? milestoneLink("certificate", 6) : milestoneLink("streak", streak!)}
          fallbackUrl={`${window.location.origin}/`}
          title={open === "certificate" ? "Your certificate" : "Your streak"}
          message={
            open === "certificate"
              ? "I completed all six shifts of Oblique's UAE VAT Document Review."
              : `I've played Oblique's UAE tax learning game ${streak} days in a row.`
          }
          subject="UAE Tax Learning Game by Oblique"
          hasName={hasName}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}
