"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { requestCode, verifyCode } from "./actions";

const RESEND_SECONDS = 60;

export function SignInForm({ next, source, referredBy }: { next: string; source: string; referredBy: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();

  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  useEffect(() => {
    if (!secondsLeft) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [secondsLeft]);

  const send = () =>
    startTransition(async () => {
      setError(null);
      setNotice(null);
      const result = await requestCode({ email, acceptedTerms, marketing, next, source, ref: referredBy });
      if (!result.ok) {
        setError(result.error ?? null);
        return;
      }
      setStep("code");
      setWaitUntil(Date.now() + RESEND_SECONDS * 1000);
      setNow(Date.now());
      if (step === "code") setNotice("A new code is on its way.");
    });

  const verify = () =>
    startTransition(async () => {
      setError(null);
      // On success the server sends the player on to their next page.
      const result = await verifyCode({ email, code, marketing, next });
      if (result && !result.ok) setError(result.error ?? null);
    });

  if (step === "code") {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          verify();
        }}
        className="flex flex-1 flex-col"
      >
        <h1 className="text-3xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-base text-muted">
          We sent a 6-digit code to <span className="font-semibold text-ink">{email}</span>. Enter it here, or tap the
          button in the email.
        </p>

        <label htmlFor="code" className="mt-8 text-sm font-semibold">
          Sign-in code
        </label>
        <input
          id="code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="mt-2 min-h-14 rounded-2xl border border-line bg-surface px-4 text-center font-mono text-3xl tracking-[0.4em] text-ink"
          aria-describedby={error ? "signin-error" : undefined}
        />

        {error && (
          <p id="signin-error" role="alert" className="mt-3 rounded-xl bg-notquite-soft px-3 py-2 text-sm text-notquite">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 text-sm text-muted">
            {notice}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-8 pb-safe">
          <button
            type="submit"
            disabled={pending || code.length < 6}
            className="min-h-14 rounded-full btn-primary px-4 text-base font-semibold"
          >
            {pending ? "Checking…" : "Sign in"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={send}
              disabled={pending || secondsLeft > 0}
              className="min-h-12 rounded-full border border-line text-sm font-semibold disabled:opacity-50"
            >
              {secondsLeft > 0 ? `New code in ${secondsLeft}s` : "Send a new code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
                setNotice(null);
              }}
              className="min-h-12 rounded-full border border-line text-sm font-semibold"
            >
              Different email
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
      className="flex flex-1 flex-col"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Sign in to play</h1>
      <p className="mt-2 text-base text-muted">
        Just your email. We&apos;ll send you a code; no password needed.
      </p>

      <label htmlFor="email" className="mt-8 text-sm font-semibold">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        placeholder="you@company.com"
        className="mt-2 min-h-14 rounded-2xl border border-line bg-surface px-4 text-base text-ink"
        aria-describedby={error ? "signin-error" : undefined}
      />

      <label className="mt-5 flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          required
          className="mt-0.5 size-5 shrink-0 accent-[#141428]"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            privacy notice
          </Link>
          .
        </span>
      </label>
      <label className="mt-2 flex min-h-11 items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-[#141428]"
        />
        <span>
          Send me new shifts and tax updates from Oblique. <span className="text-muted">Optional.</span>
        </span>
      </label>

      {error && (
        <p id="signin-error" role="alert" className="mt-3 rounded-xl bg-notquite-soft px-3 py-2 text-sm text-notquite">
          {error}
        </p>
      )}

      <div className="mt-auto pt-8 pb-safe">
        <button
          type="submit"
          disabled={pending || !email || !acceptedTerms}
          className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold"
        >
          {pending ? "Sending…" : "Email me a code"}
        </button>
      </div>
    </form>
  );
}
