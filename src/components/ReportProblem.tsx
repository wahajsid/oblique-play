"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

const REASONS = [
  { id: "wrong_answer", label: "The answer is wrong" },
  { id: "out_of_date", label: "The law or reference is out of date" },
  { id: "unclear", label: "It's unclear, or there's a typo" },
  { id: "other", label: "Something else" },
] as const;
type Reason = (typeof REASONS)[number]["id"];

// "Report a problem with this answer", under every explanation. Opens a
// short form in place. Reports go to Oblique's tax team (docs/REPORTS.md).
export function ReportProblem({ itemId, kind, signedIn = false }: { itemId: string; kind: "question" | "document"; signedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | null>(null);
  const [comment, setComment] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <p role="status" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm">
        Thanks. Oblique&apos;s tax team checks every report{email ? " and will reply by email" : ""}.
      </p>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-11 text-sm text-muted underline underline-offset-2">
        Report a problem with this answer
      </button>
    );
  }

  const send = async () => {
    if (!reason) return;
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, kind, reason, comment, email: signedIn ? "" : email, page: window.location.pathname, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send that just now. Please try again.");
      track("report_sent", { kind, reason });
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that just now. Please try again.");
      setState("idle");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="mt-3 rounded-xl border border-line p-3 text-sm"
      aria-label="Report a problem with this answer"
    >
      <fieldset>
        <legend className="font-semibold">What&apos;s wrong?</legend>
        <div className="mt-2 space-y-1">
          {REASONS.map((r) => (
            <label key={r.id} className="flex min-h-10 items-center gap-2">
              <input type="radio" name={`reason-${itemId}`} checked={reason === r.id} onChange={() => setReason(r.id)} className="size-4 accent-[#141428]" />
              {r.label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 block">
        <span className="text-muted">{reason === "other" ? "Tell us what's wrong" : "Details (optional)"}</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="For example, the article that says otherwise"
          className="mt-1 block w-full rounded-lg border border-line bg-bg px-3 py-2"
        />
      </label>
      {!signedIn && (
        <label className="mt-3 block">
          <span className="text-muted">Your email, if you&apos;d like a reply (optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={200}
            autoComplete="email"
            className="mt-1 block min-h-11 w-full rounded-lg border border-line bg-bg px-3"
          />
        </label>
      )}
      {/* Hidden from people; automated spam fills it in. */}
      <input type="text" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      {error && (
        <p role="alert" className="mt-2 text-notquite">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-full border border-line px-4 font-semibold">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!reason || (reason === "other" && !comment.trim()) || state === "sending"}
          className="min-h-11 flex-1 rounded-full btn-primary px-4 font-semibold"
        >
          {state === "sending" ? "Sending…" : "Send report"}
        </button>
      </div>
    </form>
  );
}
