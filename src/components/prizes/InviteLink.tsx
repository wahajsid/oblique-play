"use client";

import { useEffect, useState } from "react";

const MESSAGE = "I'm playing a free UAE tax game by Oblique: 20 questions a day on Corporate Tax and VAT. Try today's set:";

export function InviteLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && !!navigator.share), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  const share = async () => {
    try {
      await navigator.share({ title: "UAE tax game by Oblique", text: MESSAGE, url });
    } catch {}
  };
  const enc = encodeURIComponent;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2">
        <span className="flex-1 truncate font-mono text-sm" data-testid="invite-url">
          {url}
        </span>
        <button type="button" onClick={copy} className="min-h-10 shrink-0 rounded-full border border-line px-3 text-sm font-semibold">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {canShare ? (
          <button type="button" onClick={share} className="col-span-2 min-h-12 rounded-full btn-primary text-sm font-semibold">
            Share your link
          </button>
        ) : null}
        <a
          href={`https://wa.me/?text=${enc(`${MESSAGE} ${url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold"
        >
          WhatsApp
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold"
        >
          LinkedIn
        </a>
      </div>
    </div>
  );
}
