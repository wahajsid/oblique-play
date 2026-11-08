import { notFound } from "next/navigation";
import { SlideDeck } from "@/components/slides/SlideDeck";
import { isIsoDate } from "@/lib/quiz/dates";
import { DAILY_START, getDailyDocumentId, getFullDocument } from "@/lib/review/content";

export const metadata = { title: "Spot the error slides", robots: { index: false } };
export const dynamic = "force-dynamic";

// The "spot the error" slides for one document, answer included. Made by
// `npm run slides` on a laptop; switched off on the live site, so nobody can
// read a future daily document's answer here.
//   /slides/2026-11-17  the daily document for that date
//   /slides/s1-03       any document by id
export default async function SlidesPage({ params }: { params: Promise<{ id: string }> }) {
  if (process.env.SLIDES_ENABLED !== "true") notFound();
  const { id } = await params;
  const date = isIsoDate(id) && id >= DAILY_START ? id : null;
  const docId = date ? getDailyDocumentId(date) : id;
  const doc = docId ? getFullDocument(docId) : null;
  if (!doc) notFound();

  return (
    <>
      {/* Slides are exactly one PDF page each, edge to edge, outside the app's phone-width column. */}
      <style>{`
        body > div { max-width: none !important; margin: 0 !important; }
        @page { size: 540px 675px; margin: 0; }
        .slide { break-after: page; }
        .slide:last-child { break-after: auto; }
        nextjs-portal { display: none !important; }
      `}</style>
      <SlideDeck doc={doc} date={date} />
    </>
  );
}
