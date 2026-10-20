"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  kind: "review" | "quiz";
  attemptId: string;
  // Signed in: a challenge link with its own score card. Otherwise a plain
  // link to the same shift or quiz set.
  canChallenge: boolean;
  fallbackUrl: string;
  // The message, without the link, e.g. "I scored 17/20 on today's UAE VAT quiz. Can you beat me?"
  message: string;
  subject: string;
  hasName: boolean;
  onClose: () => void;
};

type Link = { url: string; code: string | null };

export function ShareSheet({ kind, attemptId, canChallenge, fallbackUrl, message, subject, hasName, onClose }: Props) {
  const [link, setLink] = useState<Link | null>(canChallenge ? null : { url: fallbackUrl, code: null });
  const [name, setName] = useState("");
  const [nameSaved, setNameSaved] = useState(hasName);
  const [version, setVersion] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const requestLink = async (withName?: string) => {
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, attemptId, ...(withName ? { name: withName } : {}) }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { code: string; url: string };
      setLink({ url: data.url, code: data.code });
      return true;
    } catch {
      // Still let them share, just without a score card.
      setLink((l) => l ?? { url: fallbackUrl, code: null });
      return false;
    }
  };

  useEffect(() => {
    if (canChallenge) requestLink();
    closeRef.current?.focus();
    try {
      setCanShareFiles(!!navigator.canShare?.({ files: [new File([""], "x.png", { type: "image/png" })] }));
    } catch {}
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = (size: "landscape" | "square" | "tall") =>
    link?.code ? `/c/${link.code}/card?size=${size}&v=${version}` : null;
  const full = link ? `${message} ${link.url}` : message;

  const shareLink = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: subject, text: message, url: link.url });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("Couldn't open the share menu.");
    }
  };

  // Sends the tall card itself, for WhatsApp Status or Instagram Stories.
  const shareImage = async () => {
    const src = card("tall");
    if (!src || !link) return;
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], "oblique-score.png", { type: "image/png" });
      await navigator.share({ files: [file], text: full });
    } catch (e) {
      if ((e as Error).name !== "AbortError") setNote("Couldn't share the image from this browser.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full);
      setNote("Message and link copied.");
    } catch {
      setNote("Couldn't copy. Press and hold the link to copy it.");
    }
  };

  const saveName = async () => {
    if (!name.trim()) return;
    if (await requestLink(name.trim())) {
      setNameSaved(true);
      setVersion((v) => v + 1);
    }
  };

  const enc = encodeURIComponent;
  const targets = link
    ? [
        { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link.url)}` },
        { label: "WhatsApp", href: `https://wa.me/?text=${enc(full)}` },
        { label: "Email", href: `mailto:?subject=${enc(subject)}&body=${enc(`${message}\n\n${link.url}`)}` },
      ]
    : [];
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet-up pb-safe mx-auto max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-surface px-4 pt-4"
      >
        <div className="flex items-center justify-between">
          <h2 id="share-title" className="text-lg font-semibold">
            Share or challenge
          </h2>
          <button ref={closeRef} type="button" onClick={onClose} className="-mr-2 min-h-11 rounded-full px-3 text-sm font-medium text-muted">
            Close
          </button>
        </div>

        {card("square") ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card("square")!} alt="Your score card" width={1080} height={1080} className="mt-3 aspect-square w-full rounded-xl border border-line" />
        ) : canChallenge && !link ? (
          <div className="mt-3 flex aspect-square w-full items-center justify-center rounded-xl border border-line text-sm text-muted">
            Making your card…
          </div>
        ) : null}

        {link?.code && !nameSaved && (
          <div className="mt-3 flex gap-2">
            <label htmlFor="card-name" className="sr-only">
              Your name on the card
            </label>
            <input
              id="card-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              autoComplete="nickname"
              placeholder="Add your name to the card"
              className="min-h-12 flex-1 rounded-xl border border-line bg-bg px-3 text-base"
            />
            <button type="button" onClick={saveName} disabled={!name.trim()} className="min-h-12 rounded-full border border-line px-4 text-sm font-semibold disabled:opacity-50">
              Add
            </button>
          </div>
        )}

        <p className="mt-3 text-sm text-muted">{message}</p>

        <div className="mt-4 flex flex-col gap-2">
          {hasNativeShare && (
            <button type="button" onClick={shareLink} disabled={!link} className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold">
              Share…
            </button>
          )}
          {canShareFiles && card("tall") && (
            <button type="button" onClick={shareImage} className="min-h-12 rounded-full border border-line text-sm font-semibold">
              Share image (for Stories and Status)
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {targets.map((t) => (
            <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center rounded-full border border-line text-sm font-semibold">
              {t.label}
            </a>
          ))}
          <button type="button" onClick={copy} disabled={!link} className="min-h-12 rounded-full border border-line text-sm font-semibold">
            Copy link
          </button>
        </div>

        {link?.code && (
          <p className="mt-4 text-center text-sm">
            <span className="text-muted">Save card: </span>
            {(
              [
                ["tall", "Story"],
                ["square", "Square"],
                ["landscape", "Wide"],
              ] as const
            ).map(([size, label], i) => (
              <span key={size}>
                {i > 0 && <span className="text-muted"> · </span>}
                <a href={card(size)!} download={`oblique-score-${size}.png`} className="inline-flex min-h-11 items-center px-1 font-medium underline underline-offset-2">
                  {label}
                </a>
              </span>
            ))}
          </p>
        )}

        {note && (
          <p role="status" className="mt-2 text-center text-sm text-muted">
            {note}
          </p>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}
