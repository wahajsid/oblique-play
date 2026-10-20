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
