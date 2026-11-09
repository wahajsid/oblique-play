import offers from "@/content/offers.json";

type Offer = { service: string; line: string };
const OFFERS = offers as Record<string, Record<string, Offer>>;

export type WeakTopic = { track: string; topic: string; label: string; right: number; of: number };

// The topic a player found hardest in a round: at least two questions on
// it and no more than half right. Lowest share first, then the topic with
// more questions.
export function weakestTopic(rows: { track: string; topic: string; label: string; correct: boolean }[]): WeakTopic | null {
  const byTopic = new Map<string, WeakTopic>();
  for (const r of rows) {
    const key = `${r.track}:${r.topic}`;
    const t = byTopic.get(key) ?? { track: r.track, topic: r.topic, label: r.label, right: 0, of: 0 };
    t.of++;
    if (r.correct) t.right++;
    byTopic.set(key, t);
  }
  const weak = [...byTopic.values()].filter((t) => t.of >= 2 && t.right * 2 <= t.of);
  weak.sort((a, b) => a.right / a.of - b.right / b.of || b.of - a.of || a.label.localeCompare(b.label));
  return weak[0] ?? null;
}

// The lead offer on the results screen: instead of one generic line, it
// names the topic the player just struggled with and the Oblique service
// that covers it. The wording per topic lives in src/content/offers.json.
export function TopicOffer({ weak }: { weak: WeakTopic }) {
  const offer = OFFERS[weak.track]?.[weak.topic];
  if (!offer) return null;
  return (
    <section className="mt-6 rounded-2xl border border-accent bg-accent-soft p-4" aria-labelledby="topic-offer-title" data-testid="topic-offer">
      <p className="text-xs font-semibold tracking-wide uppercase">
        {weak.label} · {weak.right}/{weak.of} today
      </p>
      <h2 id="topic-offer-title" className="mt-1 text-lg font-semibold">
        Worth a closer look: {weak.label}
      </h2>
      <p className="mt-1 text-sm">
        {offer.line} If it matters to your business, Oblique&apos;s tax team will walk you through it: a free 30-minute{" "}
        {offer.service.toLowerCase()}.
      </p>
      <form action="/diagnostic" method="post" target="_blank" className="mt-3">
        <input type="hidden" name="topic" value={`${weak.track}-${weak.topic}`} />
        <button type="submit" className="min-h-12 w-full rounded-full btn-primary px-4 text-base font-semibold">
          Book a free call
        </button>
      </form>
    </section>
  );
}
