import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OBCO_PATH } from "@/components/brand/ObliqueMark";
import { challengeLabel, displayName, type Challenge } from "@/lib/challenges";
import { formatTime } from "@/lib/review/progress";

// Share cards, drawn as images on request. Three sizes:
//   landscape 1200 x 630  LinkedIn posts and link previews
//   square    1080 x 1080 WhatsApp and feeds
//   tall      1080 x 1920 Stories and Status
export const CARD_SIZES = {
  landscape: { width: 1200, height: 630 },
  square: { width: 1080, height: 1080 },
  tall: { width: 1080, height: 1920 },
} as const;
export type CardSize = keyof typeof CARD_SIZES;

const NAVY = "#141428";
const AQUA = "#adebf2";
const CREAM = "#faf7f1";
const OBCO_VIEWBOX = "0 0 1011.81 386.23";

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 700 }[]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(join(process.cwd(), "assets/cards/Satoshi-Medium.ttf")).then((data) => ({ name: "Satoshi", data, weight: 500 as const })),
    readFile(join(process.cwd(), "assets/cards/Satoshi-Bold.ttf")).then((data) => ({ name: "Satoshi", data, weight: 700 as const })),
  ]);
  return fonts;
}

// Who's ahead in a rematch: higher score, then faster time.
// The game's own link preview: what LinkedIn and WhatsApp show when
// someone pastes play.obliqueconsult.com.
export async function renderHomeCard() {
  const width = 1200;
  const height = 630;
  const chip = (text: string) => (
    <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, border: `2px solid ${AQUA}`, color: AQUA, fontSize: 26, fontWeight: 700, marginRight: 14 }}>
      {text}
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width, height, background: NAVY, fontFamily: "Satoshi", position: "relative", padding: 64 }}>
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", width: 460, height, overflow: "hidden" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{ position: "absolute", top: -200, left: 80 + i * 80, width: 34, height: height + 400, background: AQUA, opacity: 0.08 + i * 0.03, transform: "rotate(20deg)" }} />
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <svg width={(44 * 1011.81) / 386.23} height={44} viewBox={OBCO_VIEWBOX}>
            <path d={OBCO_PATH} fill={CREAM} />
          </svg>
          <div style={{ display: "flex", marginTop: 44, fontSize: 28, color: AQUA, fontWeight: 700, letterSpacing: 2 }}>UAE TAX LEARNING GAME · FREE</div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 14, fontSize: 78, lineHeight: 1.05, color: "white", fontWeight: 700 }}>
            <div style={{ display: "flex" }}>Think you know UAE tax?</div>
            <div style={{ display: "flex" }}>Prove it in 3 minutes.</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex" }}>
            {chip("20 new questions a day")}
            {chip("Corporate Tax · VAT")}
            {chip("Spot the error")}
          </div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 24, color: "#c9cadb" }}>A learning game by Oblique. Not tax advice.</div>
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}

// The "spot the error" page's link preview: a navy card with a paper
// document, one line flagged.
export async function renderSpotCard() {
  const width = 1200;
  const height = 630;
  const line = (w: number, flagged = false) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 34,
        padding: "0 10px",
        marginTop: 8,
        borderRadius: 6,
        border: flagged ? "3px dashed #8a4b00" : "3px solid transparent",
        background: flagged ? "#fbeedc" : "transparent",
      }}
    >
      <div style={{ display: "flex", width: w, height: 10, borderRadius: 5, background: "#d8d2c4" }} />
      <div style={{ display: "flex", width: 70, height: 10, borderRadius: 5, background: flagged ? "#8a4b00" : "#b9b2a2" }} />
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ display: "flex", width, height, background: NAVY, fontFamily: "Satoshi", position: "relative", padding: 56 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 640, justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <svg width={(38 * 1011.81) / 386.23} height={38} viewBox={OBCO_VIEWBOX}>
              <path d={OBCO_PATH} fill={CREAM} />
            </svg>
            <div style={{ display: "flex", marginTop: 40, fontSize: 26, color: AQUA, fontWeight: 700, letterSpacing: 2 }}>SPOT THE ERROR</div>
            <div style={{ display: "flex", marginTop: 14, fontSize: 64, lineHeight: 1.05, color: "white", fontWeight: 700 }}>
              Today&apos;s UAE tax document. Right, or is something off?
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", fontSize: 24, color: "#c9cadb" }}>
            <div style={{ display: "flex", color: "white", fontWeight: 700 }}>A new one every day. Free.</div>
            <div style={{ display: "flex", marginTop: 6 }}>play.obliqueconsult.com · A learning game by Oblique</div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            right: 70,
            top: 70,
            width: 380,
            height: 500,
            background: CREAM,
            borderRadius: 16,
            padding: 26,
            transform: "rotate(4deg)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", fontSize: 22, letterSpacing: 6, fontWeight: 700, color: NAVY }}>TAX INVOICE</div>
          <div style={{ display: "flex", height: 2, background: "#e6e0d3", marginTop: 14, marginBottom: 6 }} />
          {line(170)}
          {line(210)}
          {line(140)}
          <div style={{ display: "flex", height: 2, background: "#e6e0d3", marginTop: 10, marginBottom: 6 }} />
          {line(190)}
          {line(120, true)}
          {line(160)}
          <div style={{ display: "flex", height: 2, background: "#e6e0d3", marginTop: 10, marginBottom: 6 }} />
          {line(150)}
          {line(180)}
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
  );
}

export function winner(a: Pick<Challenge, "score" | "timeMs">, b: Pick<Challenge, "score" | "timeMs">): "a" | "b" | "tie" {
  if (a.score !== b.score) return a.score > b.score ? "a" : "b";
  if (a.timeMs !== b.timeMs) return a.timeMs < b.timeMs ? "a" : "b";
  return "tie";
}

export async function renderChallengeCard(c: Challenge, size: CardSize) {
  const { width, height } = CARD_SIZES[size];
  const s = width / 1200; // scale everything from the landscape design
  const tall = size === "tall";
  // The wide card is only 630 tall, so it uses a tighter layout to keep the
  // address and disclaimer on the card.
  const wide = size === "landscape";
  const label = challengeLabel(c);
  const parent = c.replyTo;
  const big = parent ? (wide ? 96 : 120) : wide ? 140 : 190;

  const mark = (h: number, color: string) => (
    <svg width={(h * 1011.81) / 386.23} height={h} viewBox={OBCO_VIEWBOX}>
      <path d={OBCO_PATH} fill={color} />
    </svg>
  );

  const scoreBlock = (name: string, score: number, total: number, timeMs: number, lead: boolean) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <div style={{ display: "flex", fontSize: (wide ? 26 : 30) * s, color: CREAM, opacity: 0.85 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 4 * s }}>
        <span style={{ fontSize: big * s, fontWeight: 700, color: lead ? AQUA : CREAM, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: (big / 2) * s, fontWeight: 700, color: CREAM, opacity: 0.6, marginLeft: 8 * s }}>/{total}</span>
      </div>
      <div style={{ display: "flex", fontSize: (wide ? 22 : 26) * s, color: CREAM, opacity: 0.7, marginTop: 6 * s }}>{formatTime(timeMs)}</div>
    </div>
  );

  let headline: string;
  let body: React.ReactNode;
  if (parent) {
    const w = winner(c, parent);
    headline =
      w === "tie" ? "Dead heat." : `${w === "a" ? displayName(c) : displayName(parent)} ${w === "a" ? "takes it" : "holds on"}.`;
    body = (
      <div style={{ display: "flex", flexDirection: tall ? "column" : "row", gap: (tall ? 60 : 90) * s, marginTop: (wide ? 8 : 40) * s }}>
        {scoreBlock(displayName(c), c.score, c.total, c.timeMs, w === "a")}
        {scoreBlock(displayName(parent), parent.score, parent.total, parent.timeMs, w === "b")}
      </div>
    );
  } else {
    headline = "Can you beat it?";
    body = <div style={{ display: "flex", marginTop: (wide ? 8 : 30) * s }}>{scoreBlock(`${displayName(c)} scored`, c.score, c.total, c.timeMs, true)}</div>;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          padding: (tall ? 110 : wide ? 50 : 64) * s,
          fontFamily: "Satoshi",
          position: "relative",
        }}
      >
        {/* The site's diagonal aqua stripes, top right */}
        <div style={{ position: "absolute", top: 0, right: 0, display: "flex", width: 520 * s, height: height, overflow: "hidden" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: -200 * s,
                left: (60 + i * 80) * s,
                width: 34 * s,
                height: height + 400 * s,
                background: AQUA,
                opacity: 0.08 + i * 0.03,
                transform: "rotate(20deg)",
              }}
            />
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {mark((wide ? 38 : 44) * s, CREAM)}
          <div style={{ display: "flex", marginTop: (wide ? 18 : 34) * s, fontSize: (wide ? 24 : 28) * s, color: AQUA, fontWeight: 700, letterSpacing: 1 }}>
            UAE TAX LEARNING GAME
          </div>
          <div style={{ display: "flex", marginTop: 6 * s, fontSize: (wide ? 32 : 36) * s, color: CREAM, maxWidth: 900 * s }}>{label}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {body}
          <div style={{ display: "flex", marginTop: (wide ? 14 : 34) * s, fontSize: (wide ? 44 : 56) * s, fontWeight: 700, color: CREAM }}>{headline}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: (wide ? 21 : 24) * s, color: CREAM }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>play.obliqueconsult.com</span>
            <span style={{ opacity: 0.6, marginTop: 4 * s }}>A learning game by Oblique. Not tax advice.</span>
          </div>
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}

type MilestoneCard = { kind: "streak" | "certificate"; value: number; name: string | null; createdAt: string };

// Streak cards (7, 30, 100 days) and the certificate for all six shifts.
export async function renderMilestoneCard(m: MilestoneCard, size: CardSize) {
  const { width, height } = CARD_SIZES[size];
  const s = width / 1200;
  const wide = size === "landscape";
  const tall = size === "tall";
  const who = m.name || "A player";
  const cert = m.kind === "certificate";
  const fg = cert ? NAVY : CREAM;
  const date = new Date(m.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dubai" });
  const mark = (h: number) => (
    <svg width={(h * 1011.81) / 386.23} height={h} viewBox={OBCO_VIEWBOX}>
      <path d={OBCO_PATH} fill={fg} />
    </svg>
  );

  const body = cert ? (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <div style={{ display: "flex", fontSize: (wide ? 26 : 30) * s, letterSpacing: 4, fontWeight: 700, color: "#3c3c7f" }}>
        CERTIFICATE OF COMPLETION
      </div>
      <div style={{ display: "flex", marginTop: (wide ? 24 : 40) * s, fontSize: 28 * s, opacity: 0.75 }}>Awarded to</div>
      <div style={{ display: "flex", marginTop: 6 * s, fontSize: (wide ? 72 : 84) * s, fontWeight: 700, lineHeight: 1.05 }}>{who}</div>
      <div style={{ display: "flex", marginTop: (wide ? 18 : 30) * s, fontSize: (wide ? 28 : 32) * s, maxWidth: 900 * s, justifyContent: "center" }}>
        for completing all six shifts of the UAE VAT Document Review
      </div>
      <div style={{ display: "flex", marginTop: (wide ? 22 : 40) * s, fontSize: 26 * s, fontWeight: 700 }}>Awarded by Oblique · {date}</div>
    </div>
  ) : (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "baseline" }}>
        <span style={{ fontSize: (wide ? 190 : 260) * s, fontWeight: 700, color: AQUA, lineHeight: 1 }}>{m.value}</span>
        <span style={{ fontSize: (wide ? 56 : 72) * s, fontWeight: 700, marginLeft: 16 * s }}>days in a row</span>
      </div>
      <div style={{ display: "flex", marginTop: 18 * s, fontSize: (wide ? 40 : 48) * s, fontWeight: 700 }}>
        {who} is on a {m.value}-day streak.
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: cert ? "center" : "stretch",
          background: cert ? CREAM : NAVY,
          color: fg,
          padding: (tall ? 110 : wide ? 50 : 64) * s,
          fontFamily: "Satoshi",
          position: "relative",
          // A thick outer rule frames the certificate (the image renderer
          // has no "double" border, so the thin inner rule is a second box).
          border: cert ? `${10 * s}px solid ${NAVY}` : "none",
        }}
      >
        {cert && (
          <div
            style={{
              position: "absolute",
              top: 14 * s,
              left: 14 * s,
              right: 14 * s,
              bottom: 14 * s,
              border: `${2 * s}px solid ${NAVY}`,
              display: "flex",
            }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", alignItems: cert ? "center" : "flex-start" }}>
          {mark((wide ? 38 : 44) * s)}
          <div style={{ display: "flex", marginTop: 14 * s, fontSize: (wide ? 22 : 26) * s, fontWeight: 700, letterSpacing: 1, color: cert ? "#3c3c7f" : AQUA }}>
            UAE TAX LEARNING GAME
          </div>
        </div>
        {body}
        <div style={{ display: "flex", flexDirection: "column", alignItems: cert ? "center" : "flex-start", fontSize: (wide ? 20 : 24) * s }}>
          <span style={{ fontWeight: 700 }}>play.obliqueconsult.com</span>
          <span style={{ opacity: 0.65, marginTop: 4 * s }}>
            {cert ? "For learning purposes only. Not a professional qualification." : "A learning game by Oblique. Not tax advice."}
          </span>
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts(), headers: { "Cache-Control": "public, max-age=300, s-maxage=3600" } },
  );
}
