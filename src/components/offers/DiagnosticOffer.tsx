// The lead offer for business owners: a free 30-minute tax diagnostic.
// Shown on results screens and the profile page when the player's role is
// "Business owner".
export function DiagnosticOffer() {
  return (
    <section className="mt-6 rounded-2xl border border-accent bg-accent-soft p-4" aria-labelledby="diagnostic-title">
      <h2 id="diagnostic-title" className="text-lg font-semibold">
        Running a business?
      </h2>
      <p className="mt-1 text-sm">
        Book a free 30-minute tax diagnostic with Oblique. We&apos;ll look at your Corporate Tax and VAT position and tell
        you, in plain words, what needs attention.
      </p>
      <form action="/diagnostic" method="post" target="_blank" className="mt-3">
        <button type="submit" className="min-h-12 w-full rounded-full btn-primary px-4 text-base font-semibold">
          Book a free diagnostic
        </button>
      </form>
    </section>
  );
}
