import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";

export default async function Home() {
  const player = await getSignedInPlayer();
  return (
    <>
      <AppHeader>
        {player ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-medium text-muted">
              Sign out
            </button>
          </form>
        ) : (
          authEnabled && (
            <Link href="/signin" className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium">
              Sign in
            </Link>
          )
        )}
      </AppHeader>
      <main className="flex flex-1 flex-col px-4 pt-6">
        <p className="text-sm font-medium text-muted">A learning game by Oblique</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">Learn UAE tax by doing it.</h1>
        <p className="mt-3 text-base text-muted">
          Review invoices, spot what&apos;s off and see why. Every business here is made up; the rules are real.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/review"
            className="group rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
          >
            <p className="text-xs font-semibold tracking-wide text-accent uppercase">VAT · 6 shifts</p>
            <h2 className="mt-1 text-xl font-semibold">Document review</h2>
            <p className="mt-1 text-sm text-muted">
              Three-minute shifts. Check each document: does it look right, or is something off?
            </p>
            <span className="mt-4 inline-flex min-h-11 items-center rounded-full btn-primary px-4 text-sm font-semibold">
              Start a shift
            </span>
          </Link>

          <div className="rounded-2xl border border-dashed border-line p-5" aria-disabled="true">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Corporate Tax · VAT</p>
            <h2 className="mt-1 text-xl font-semibold text-muted">Daily quiz</h2>
            <p className="mt-1 text-sm text-muted">20 fresh questions every day, with the what and why after each one.</p>
            <p className="mt-3 text-sm font-medium text-muted">Coming soon</p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
