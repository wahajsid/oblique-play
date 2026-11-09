import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { getMilestone, milestoneUrl, type Milestone } from "@/lib/milestones";

type Params = { params: Promise<{ code: string }> };

function headline(m: Milestone) {
  const who = m.name || "A player";
  return m.kind === "certificate"
    ? `${who} completed all six shifts of the UAE VAT Document Review.`
    : `${who} is on a ${m.value}-day streak.`;
}

// LinkedIn's "add to profile" form, filled in: the certificate then sits
// under Licences & certifications, with a link back to this page.
function linkedInAddUrl(m: Milestone) {
  const issued = new Date(m.createdAt);
  const q = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: "UAE VAT Document Review",
    organizationName: "Oblique Consult",
    issueYear: String(issued.getUTCFullYear()),
    issueMonth: String(issued.getUTCMonth() + 1),
    certUrl: milestoneUrl(m.code),
    certId: m.code,
  });
  return `https://www.linkedin.com/profile/add?${q}`;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const m = await getMilestone(code);
  if (!m) return { title: "UAE Tax Learning Game · by Oblique" };
  const title = headline(m);
  const description = "A free UAE tax learning game by Oblique. Learn by spotting what's right or off on real-looking tax documents.";
  const image = { url: `/m/${code}/card`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    openGraph: { title, description, url: milestoneUrl(code), images: [image], type: "website", siteName: "Oblique" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function MilestonePage({ params }: Params) {
  const { code } = await params;
  const m = await getMilestone(code);
  if (!m) notFound();
  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{m.kind === "certificate" ? "Certificate" : "Streak"}</p>
        <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance">{headline(m)}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/m/${code}/card?size=square`} alt={headline(m)} width={1080} height={1080} className="mt-5 aspect-square w-full rounded-2xl border border-line" />
        <div className="mt-auto pt-8 pb-safe">
          {m.kind === "certificate" && (
            <a
              href={linkedInAddUrl(m)}
              target="_blank"
              rel="noopener noreferrer"
              className="mb-2 flex min-h-12 items-center justify-center rounded-full border border-line px-4 text-sm font-semibold"
            >
              Yours? Add it to your LinkedIn profile
            </a>
          )}
          <Link href="/" className="flex min-h-14 items-center justify-center rounded-full btn-primary px-4 text-base font-semibold">
            Play the game
          </Link>
          <p className="mt-2 text-center text-xs text-muted">Free. Sign in with just your email.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
