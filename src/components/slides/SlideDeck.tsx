"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ObliqueMark, ObliqueWordmark } from "@/components/brand/ObliqueMark";
import { TaxDocument } from "@/components/review/TaxDocument";
import { longDate } from "@/lib/quiz/dates";
import type { ReviewDocument } from "@/lib/review/types";

// Six portrait slides (540×675, saved at 2x = 1080×1350, LinkedIn's
// recommended size) for a "spot the error" document post:
// hook, invoice top, invoice bottom, answer, why, play link.

const W = 540;
const H = 675;
const noop = () => {};

// Scales its content down (never up) to fit the space left on the slide,
// so a longer document or explanation never spills off the edge.
function Fit({ width, children }: { width: number; children: React.ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const o = outer.current;
      const i = inner.current;
      if (!o || !i) return;
      const scale = Math.min(1, o.clientHeight / i.offsetHeight);
      i.style.transform = `scale(${scale})`;
    };
    fit();
    document.fonts.ready.then(fit);
  }, []);
  return (
    <div ref={outer} className="relative min-h-0 flex-1 overflow-hidden">
      <div ref={inner} style={{ width, transformOrigin: "top center" }} className="mx-auto">
        {children}
      </div>
    </div>
  );
}

function Slide({ n, dark, draft, children }: { n: number; dark?: boolean; draft: boolean; children: React.ReactNode }) {
  return (
    <section
      className={`slide relative flex flex-col overflow-hidden px-7 pt-6 pb-5 ${dark ? "bg-[#141428] text-white" : "bg-[#f4f2ec] text-[#141428]"}`}
      style={{ width: W, height: H }}
      data-slide={n}
    >
      {children}
      {draft && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="-rotate-[24deg] rounded-lg border-4 border-[#c2410c]/70 px-4 py-1 text-3xl font-black tracking-widest whitespace-nowrap text-[#c2410c]/70">
            DRAFT · NOT YET REVIEWED
          </span>
        </div>
      )}
    </section>
  );
}

function Top({ dark, label }: { dark?: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <ObliqueMark height={20} className={dark ? "text-white" : "text-[#141428]"} />
      <span className={`text-[12px] font-semibold tracking-[0.14em] uppercase ${dark ? "text-[#adebf2]" : "text-[#3c3c7f]"}`}>{label}</span>
    </div>
  );
}

function Bottom({ dark, n, note }: { dark?: boolean; n: number; note?: string }) {
  return (
    <div className={`mt-3 flex items-center justify-between text-[13px] ${dark ? "text-[#c9cadb]" : "text-[#5c5f6b]"}`}>
      <span className="font-medium">{note ?? "play.obliqueconsult.com"}</span>
      <span className="tabular-nums">
        {n}/6{n < 6 && <span className="ml-1.5 font-semibold">→</span>}
      </span>
    </div>
  );
}

export function SlideDeck({ doc, date }: { doc: ReviewDocument; date: string | null }) {
  // Ready for capture once fonts have loaded and every Fit has re-measured
  // (their font handlers were registered first, so they run first).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => requestAnimationFrame(() => setReady(true)));
  }, []);
  const draft = doc.meta.status !== "approved";
  const label = date ? `Spot the error · ${longDate(date)}` : "Spot the error";
  const thing = doc.heading.value.toLowerCase();

  const topIds = new Set([
    doc.heading.id,
    ...doc.blocks.filter((b) => b.variant === "party" || b.variant === "details").flatMap((b) => [b.id, ...b.fields.map((f) => f.id)]),
  ]);
  const targets = doc.answer.verdict === "off" ? doc.answer.targets : [];
  const inTop = targets.some((t) => topIds.has(t));
  const inBottom = targets.some((t) => !topIds.has(t));
  const answerPart = inTop && inBottom ? undefined : inTop ? "top" : inBottom ? "bottom" : undefined;
  const docWidth = W - 56;

  return (
    <div data-ready={ready ? "true" : "false"} className="deck">
      {/* 1. Hook */}
      <Slide n={1} dark draft={draft}>
        <Top dark label={label} />
        <h1 className="mt-7 text-[40px] leading-[1.08] font-bold tracking-tight">
          Would you approve this {thing}?
        </h1>
        <p className="mt-3 text-[19px] leading-snug text-[#c9cadb]">
          Or is something off? Check it like an auditor would, then swipe for the answer.
        </p>
        <div className="mt-6 flex min-h-0 flex-1 flex-col">
          <Fit width={docWidth}>
            <TaxDocument doc={doc} mode="browse" selectedId={null} stamp={null} onTap={noop} />
          </Fit>
        </div>
        <Bottom dark n={1} note="Swipe to look closer" />
      </Slide>

      {/* 2. Invoice, top half */}
      <Slide n={2} draft={draft}>
        <Top label="The document · 1 of 2" />
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <Fit width={docWidth}>
            <TaxDocument doc={doc} mode="browse" selectedId={null} stamp={null} onTap={noop} part="top" />
          </Fit>
        </div>
        <Bottom n={2} />
      </Slide>

      {/* 3. Invoice, bottom half */}
      <Slide n={3} draft={draft}>
        <Top label="The document · 2 of 2" />
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <Fit width={docWidth}>
            <TaxDocument doc={doc} mode="browse" selectedId={null} stamp={null} onTap={noop} part="bottom" />
          </Fit>
        </div>
        <p className="mt-4 rounded-2xl bg-[#141428] px-5 py-4 text-center text-[20px] font-semibold text-white">
          Made your call? <span className="text-[#adebf2]">Right, or something off?</span>
        </p>
        <Bottom n={3} note="Answer on the next slide" />
      </Slide>

      {/* 4. The answer */}
      <Slide n={4} dark draft={draft}>
        <Top dark label="The answer" />
        {doc.answer.verdict === "off" ? (
          <>
            <p className="mt-6 text-[15px] font-semibold tracking-[0.12em] text-[#f2b66b] uppercase">Something&apos;s off</p>
            <h2 className="mt-1 text-[32px] leading-tight font-bold">{doc.answer.targetLabel}</h2>
          </>
        ) : (
          <>
            <p className="mt-6 text-[15px] font-semibold tracking-[0.12em] text-[#74e984] uppercase">It&apos;s right</p>
            <h2 className="mt-1 text-[32px] leading-tight font-bold">Nothing to flag. This one is correct.</h2>
          </>
        )}
        <div className="relative mt-5 flex min-h-0 flex-1 flex-col">
          <Fit width={docWidth}>
            <TaxDocument doc={doc} mode="reveal" selectedId={null} revealIds={targets} stamp={null} onTap={noop} part={answerPart} />
          </Fit>
          {doc.answer.verdict === "right" && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
              <span className="-rotate-12 rounded-xl border-[6px] border-[#1d7a5c] bg-[#faf7f1]/85 px-6 py-2 text-[44px] font-black tracking-widest text-[#1d7a5c] uppercase">
                Looks right
              </span>
            </div>
          )}
        </div>
        <Bottom dark n={4} note="Why? Next slide" />
      </Slide>

      {/* 5. Why */}
      <Slide n={5} draft={draft}>
        <Top label="Why" />
        <div className="mt-5 flex min-h-0 flex-1 flex-col">
          <Fit width={docWidth}>
            <div className="rounded-2xl border border-[#e6e0d3] bg-white p-6">
              <p className="text-[13px] font-semibold tracking-[0.12em] text-[#5c5f6b] uppercase">What</p>
              <p className="mt-1 text-[21px] leading-snug">{doc.explanation.what}</p>
              <p className="mt-5 text-[13px] font-semibold tracking-[0.12em] text-[#5c5f6b] uppercase">Why it matters</p>
              <p className="mt-1 text-[21px] leading-snug">{doc.explanation.why}</p>
              <p className="mt-5 text-[13px] font-semibold tracking-[0.12em] text-[#5c5f6b] uppercase">The law</p>
              <p className="mt-1 text-[16px] leading-snug text-[#5c5f6b]">{doc.explanation.reference}</p>
            </div>
          </Fit>
        </div>
        <Bottom n={5} />
      </Slide>

      {/* 6. Play */}
      <Slide n={6} dark draft={draft}>
        <Top dark label="UAE tax learning game" />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[45%]"
          style={{ background: "repeating-linear-gradient(115deg, transparent 0 34px, rgba(173,235,242,.10) 34px 52px)" }}
          aria-hidden="true"
        />
        <div className="relative flex flex-1 flex-col justify-center">
          <h2 className="text-[44px] leading-[1.05] font-bold tracking-tight">
            A new document
            <br />
            every day.
          </h2>
          <p className="mt-4 max-w-[400px] text-[20px] leading-snug text-[#c9cadb]">
            Plus 20 Corporate Tax and VAT questions, with the rule behind every answer. Free, on your phone.
          </p>
          <p className="btn-primary mt-8 inline-flex self-start rounded-full px-6 py-3 text-[22px] font-bold">
            play.obliqueconsult.com
          </p>
          <p className="mt-8 text-[14px] text-[#a7a9bb]">Made-up businesses. Real UAE rules. Not tax advice.</p>
        </div>
        <div className="relative flex items-end justify-between">
          <ObliqueWordmark height={18} className="text-white" />
          <span className="text-[13px] text-[#c9cadb] tabular-nums">6/6</span>
        </div>
      </Slide>
    </div>
  );
}
