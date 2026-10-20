import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ShiftList } from "@/components/review/ShiftList";
import { getShifts } from "@/lib/review/content";

export const metadata = { title: "Document review · by Oblique" };

export default function ReviewHome() {
  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Document review</h1>
        <p className="mt-1 text-sm text-muted">One new VAT rule per shift. Ten documents, about three minutes.</p>
        <Link
          href="/review/daily"
          className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-accent bg-accent-soft p-4"
        >
          <span>
            <span className="block text-xs font-semibold tracking-wide uppercase">Today&apos;s document</span>
            <span className="mt-0.5 block text-sm">One new document a day, the same for everyone.</span>
          </span>
          <span aria-hidden="true" className="text-lg">→</span>
        </Link>
        <ShiftList shifts={getShifts()} />
      </main>
      <SiteFooter />
    </>
  );
}
