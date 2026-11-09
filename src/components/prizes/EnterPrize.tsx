"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setPrizeEntry } from "@/app/actions/prizes";
import { track } from "@/lib/analytics";

export function EnterPrize({ entered }: { entered: boolean }) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (enter: boolean) => {
    setBusy(true);
    setError(null);
    const result = await setPrizeEntry({ enter, confirmed }).catch(() => ({ ok: false, error: "Couldn't save just now. Please try again." }));
    setBusy(false);
    if (!result.ok) setError(result.error ?? "Something went wrong.");
    else {
      if (enter) track("prize_entered");
      router.refresh();
    }
  };

  if (entered) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ok">✓ You&apos;re entered</p>
        <button type="button" onClick={() => save(false)} disabled={busy} className="min-h-11 px-1 text-sm text-muted underline underline-offset-2">
          Withdraw
        </button>
        {error && <p className="text-sm text-notquite">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="flex gap-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[#141428]" />
        <span>
          I&apos;m 18 or over and live in the UAE. I don&apos;t work for Oblique, I haven&apos;t reviewed questions for this game,
          and I&apos;m not related to anyone who has. I agree to the{" "}
          <Link href="/prizes/rules" className="underline underline-offset-2">
            prize rules
          </Link>
          .
        </span>
      </label>
      <button
        type="button"
        onClick={() => save(true)}
        disabled={!confirmed || busy}
        className="mt-3 min-h-12 w-full rounded-full btn-primary text-sm font-semibold"
      >
        {busy ? "Saving…" : "Enter this month's prizes"}
      </button>
      <p className="mt-2 text-xs text-muted">Free to enter. All your points this month count, even from before you entered.</p>
      {error && <p className="mt-2 text-sm text-notquite">{error}</p>}
    </div>
  );
}
