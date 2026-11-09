"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/analytics";

// Shown when a page fails on the server or in the browser. Progress is
// saved after every answer, so trying again loses nothing.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="flex flex-1 flex-col px-4 pt-20">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">Something went wrong</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">That didn&apos;t load.</h1>
      <p className="mt-2 text-base text-muted">It&apos;s on our side, not yours. Your answers so far are saved.</p>
      <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
        <button type="button" onClick={reset} className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold">
          Try again
        </button>
        <Link href="/" className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
          Home
        </Link>
      </div>
    </main>
  );
}
