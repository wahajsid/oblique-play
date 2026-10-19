"use client";

import { useState, useTransition } from "react";
import { saveProfile } from "@/app/actions/profile";
import type { PlayerProfile, PlayerRole } from "@/lib/players";

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: "business_owner", label: "Business owner" },
  { value: "finance_professional", label: "Finance professional" },
  { value: "student", label: "Student" },
];

// Asked once, after the first round. Every part is optional.
export function ProfileCard({ profile }: { profile: PlayerProfile }) {
  const [name, setName] = useState(profile.displayName ?? "");
  const [role, setRole] = useState<PlayerRole | null>(profile.role);
  const [mode, setMode] = useState(profile.leaderboardMode);
  const [state, setState] = useState<"open" | "saved" | "skipped">("open");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (state === "skipped") return null;
  if (state === "saved") {
    return (
      <p role="status" className="mt-6 rounded-2xl bg-ok-soft px-4 py-3 text-sm text-ok">
        Saved. You can change these any time.
      </p>
    );
  }

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveProfile({ displayName: name, role, leaderboardMode: mode });
      if (result.ok) setState("saved");
      else setError(result.error ?? null);
    });

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface p-4" aria-labelledby="profile-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="profile-title" className="text-lg font-semibold">
          Make it yours
        </h2>
        <button
          type="button"
          onClick={() => setState("skipped")}
          className="-mt-2 -mr-2 min-h-11 rounded-full px-3 text-sm font-medium text-muted"
        >
          Skip
        </button>
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
            aria-checked={mode === value}
            disabled={value === "name" && !name.trim()}
            onClick={() => setMode(value)}
            className={`min-h-11 rounded-xl border px-3 text-left text-sm disabled:opacity-50 ${
              mode === value ? "border-accent font-semibold ring-1 ring-accent" : "border-line"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

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
