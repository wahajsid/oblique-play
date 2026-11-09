"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions/profile";
import { track } from "@/lib/analytics";
import { DiagnosticOffer } from "@/components/offers/DiagnosticOffer";
import type { PlayerProfile, PlayerRole } from "@/lib/players";

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: "business_owner", label: "Business owner" },
  { value: "finance_professional", label: "Finance professional" },
  { value: "student", label: "Student" },
];

// "first": asked once after the first round; every part optional, skippable.
// "edit": the profile page, which also holds the marketing choice.
export function ProfileCard({ profile, mode = "first" }: { profile: PlayerProfile; mode?: "first" | "edit" }) {
  const editing = mode === "edit";
  const [name, setName] = useState(profile.displayName ?? profile.suggestedName ?? "");
  const [company, setCompany] = useState(profile.company ?? "");
  const [role, setRole] = useState<PlayerRole | null>(profile.role);
  const [board, setBoard] = useState(profile.leaderboardMode);
  const [marketing, setMarketing] = useState(profile.marketingConsent);
  const [state, setState] = useState<"open" | "saved" | "skipped">("open");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state === "skipped") return null;
  if (state === "saved" && !editing) {
    return (
      <>
        <p role="status" className="mt-6 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
          Saved. You can change these any time on your profile.
        </p>
        {role === "business_owner" && <DiagnosticOffer />}
      </>
    );
  }

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveProfile({
        displayName: name,
        company,
        role,
        leaderboardMode: board,
        ...(editing ? { marketing } : {}),
      });
      if (result.ok) {
        track("profile_saved", { has_company: !!company.trim(), role });
        setState("saved");
      }
      else setError(result.error ?? null);
    });

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4" aria-labelledby="profile-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="profile-title" className="text-lg font-semibold">
          {editing ? "Your details" : "Make it yours"}
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => setState("skipped")}
            className="-mt-2 -mr-2 min-h-11 rounded-full px-3 text-sm font-medium text-muted"
          >
            Skip
          </button>
        )}
      </div>

      <label htmlFor="display-name" className="mt-2 block text-sm font-semibold">
        Display name
      </label>
      <input
        id="display-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={40}
        autoComplete="nickname"
        placeholder="Shown on challenge cards"
        className="mt-1 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
      />

      <label htmlFor="company" className="mt-4 block text-sm font-semibold">
        Company <span className="font-normal text-muted">(optional)</span>
      </label>
      <input
        id="company"
        value={company}
        onChange={(e) => setCompany(e.target.value)}
        maxLength={80}
        autoComplete="organization"
        placeholder="Where you work"
        className="mt-1 min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base"
      />

      <p className="mt-4 text-sm font-semibold" id="role-label">
        I&apos;m a…
      </p>
      <div className="mt-1 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="role-label">
        {ROLES.map((r) => (
          <button
            key={r.value}
            type="button"
            role="radio"
            aria-checked={role === r.value}
            onClick={() => setRole(role === r.value ? null : r.value)}
            className={`min-h-11 rounded-full border px-4 text-sm font-medium ${
              role === r.value ? "border-accent bg-accent text-bg" : "border-line"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm font-semibold" id="board-label">
        On the leaderboard, show me as
      </p>
      <div className="mt-1 grid gap-2" role="radiogroup" aria-labelledby="board-label">
        {(
          [
            ["name", name.trim() ? name.trim() : "My display name"],
            ["anonymous", `${profile.anonymousName} (anonymous)`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={board === value}
            disabled={value === "name" && !name.trim()}
            onClick={() => setBoard(value)}
            className={`min-h-11 rounded-xl border px-3 text-left text-sm disabled:opacity-50 ${
              board === value ? "border-accent font-semibold ring-1 ring-accent" : "border-line"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {editing && (
        <label className="mt-4 flex min-h-11 items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#141428]"
          />
          <span>Send me new shifts and tax updates from Oblique.</span>
        </label>
      )}

      {state === "saved" && editing && (
        <p role="status" className="mt-3 text-sm text-ok">
          Saved.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-notquite">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="mt-4 min-h-12 w-full rounded-full btn-primary text-base font-semibold"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </section>
  );
}
