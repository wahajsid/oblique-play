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
        <ShiftList shifts={getShifts()} />
      </main>
      <SiteFooter />
    </>
  );
}
