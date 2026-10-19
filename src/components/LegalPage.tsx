import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";

// Set to true once Oblique has reviewed and approved the privacy notice and
// terms. Until then, both pages say they're drafts.
export const LEGAL_APPROVED = false;

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4 pb-8">
        {!LEGAL_APPROVED && (
          <p className="mb-4 rounded-xl bg-notquite-soft px-3 py-2 text-sm text-notquite">
            Draft for review. Not yet approved by Oblique.
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-6 space-y-4 text-[15px] leading-relaxed [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
