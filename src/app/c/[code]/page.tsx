import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { winner } from "@/lib/cards";
import { challengeLabel, challengeUrl, displayName, getChallenge, onLabel, type Challenge } from "@/lib/challenges";
import { getDailySet, getPlayIds, getPublicQuestions } from "@/lib/quiz/content";
import { getShiftDocuments } from "@/lib/review/content";
import { formatTime } from "@/lib/review/progress";

type Params = { params: Promise<{ code: string }> };

function invitation(c: Challenge): string {
  const label = onLabel(c);
  if (!c.replyTo) return `${displayName(c)} scored ${c.score}/${c.total} on ${label}. Your turn.`;
  const w = winner(c, c.replyTo);
  if (w === "tie") return `${displayName(c)} matched ${displayName(c.replyTo)}'s ${c.score}/${c.total} on ${label}. Your turn.`;
  return w === "a"
    ? `${displayName(c)} beat ${displayName(c.replyTo)} with ${c.score}/${c.total} on ${label}. Your turn.`
    : `${displayName(c)} scored ${c.score}/${c.total}, short of ${displayName(c.replyTo)}'s ${c.replyTo.score}/${c.total}, on ${label}. Your turn.`;
}

// Link previews (LinkedIn, WhatsApp) read these: the card shows the score.
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { code } = await params;
  const c = await getChallenge(code);
  if (!c) return { title: "UAE Tax Learning Game · by Oblique" };
  const title = `${displayName(c)} scored ${c.score}/${c.total}. Can you beat it?`;
  const description = `${challengeLabel(c)}. A free UAE tax learning game by Oblique.`;
  const image = { url: `/c/${code}/card`, width: 1200, height: 630, alt: title };
  return {
    title,
    description,
    openGraph: { title, description, url: challengeUrl(code), images: [image], type: "website", siteName: "Oblique" },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export default async function ChallengePage({ params }: Params) {
  const { code } = await params;
  const c = await getChallenge(code);
  if (!c) notFound();

  // A preview of the first question or document, before sign-up.
  let preview: { heading: string; text: string } | null = null;
  if (c.kind === "quiz") {
    const day = getDailySet(c.setDate!);
    const first = day ? getPublicQuestions(getPlayIds(day, c.track!).slice(0, 1))[0] : null;
    if (first) preview = { heading: "First question", text: first.prompt };
  } else {
    const doc = getShiftDocuments(c.shift!)[0];
    if (doc) {
      const supplier = doc.blocks.find((b) => b.id === "supplier")?.fields[0]?.value;
      preview = { heading: "First document", text: `${doc.heading.value[0]}${doc.heading.value.slice(1).toLowerCase()} from ${supplier}. Does it look right, or is something off?` };
    }
  }

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">Challenge</p>
        <h1 className="mt-1 text-2xl leading-tight font-semibold tracking-tight text-balance">{invitation(c)}</h1>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/c/${code}/card?size=square`}
          alt={`${displayName(c)} scored ${c.score} out of ${c.total} in ${formatTime(c.timeMs)}`}
          width={1080}
          height={1080}
          className="mt-5 aspect-square w-full rounded-2xl border border-line"
        />

        {preview && (
          <section className="mt-5 rounded-2xl border border-paper-line bg-paper p-4 text-paper-ink">
            <h2 className="text-xs font-semibold tracking-wide text-paper-muted uppercase">{preview.heading}</h2>
            <p className="mt-1 text-[15px] leading-snug">{preview.text}</p>
          </section>
        )}

        <div className="mt-auto pt-8 pb-safe">
          <a
            href={`/c/${code}/play`}
            className="flex min-h-14 items-center justify-center rounded-full btn-primary px-4 text-base font-semibold"
          >
            Take the challenge
          </a>
          <p className="mt-2 text-center text-xs text-muted">Free. Same questions, same order. Sign in with just your email.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
