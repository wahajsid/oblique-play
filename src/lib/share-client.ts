// Browser-side helpers that ask the server for a shareable link. The server
// checks the result or milestone is real before making one.
import type { CreateLink } from "@/components/share/ShareSheet";

async function post(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) return null;
  return (await res.json()) as { code: string; url: string };
}

export const challengeLink =
  (kind: "review" | "quiz", attemptId: string): CreateLink =>
  async (name) => {
    const r = await post("/api/challenge", { kind, attemptId, ...(name ? { name } : {}) });
    return r && { url: r.url, cardPath: `/c/${r.code}/card` };
  };

export const milestoneLink =
  (kind: "streak" | "certificate", value: number): CreateLink =>
  async (name) => {
    const r = await post("/api/milestone", { kind, value, ...(name ? { name } : {}) });
    return r && { url: r.url, cardPath: `/m/${r.code}/card` };
  };
