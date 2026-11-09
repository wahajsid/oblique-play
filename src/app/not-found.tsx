import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "Page not found · by Oblique" };

export default function NotFound() {
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pt-6">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Page not found</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-balance">That page isn&apos;t here.</h1>
        <p className="mt-2 text-base text-muted">
          The link may be old, or a challenge may have been removed. Today&apos;s quiz and document are one tap away.
        </p>
        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          <Link href="/quiz" className="flex min-h-14 items-center justify-center rounded-full btn-primary px-4 text-base font-semibold">
            Today&apos;s quiz
          </Link>
          <Link href="/" className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
            Home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
