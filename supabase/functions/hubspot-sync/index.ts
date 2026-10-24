// Supabase Edge Function: sends new and updated players to HubSpot.
//
// Triggered by a Database Webhook on public.players (insert and update).
// HubSpot matches on email address, so this updates an existing contact
// rather than creating a duplicate.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   HUBSPOT_ACCESS_TOKEN  private app token with crm.objects.contacts.read/write
//   WEBHOOK_SECRET        shared with the Database Webhook's x-webhook-secret header
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

type Player = {
  id: string;
  email: string;
  display_name: string | null;
  role: string | null;
  source: string;
  referred_by: string | null;
  marketing_consent: boolean;
  marketing_consent_at: string | null;
  modules_played: string[];
  quiz_tracks_played: string[];
  shifts_completed: number;
  best_scores: Record<string, number>;
  current_streak: number;
  diagnostic_clicked_at: string | null;
  prize_entered_at: string | null;
  created_at: string;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: Player | null;
  old_record: Player | null;
};

const LABELS: Record<string, string> = {
  document_review: "Document game",
  daily_quiz: "Daily quiz",
  ct: "Corporate Tax",
  vat: "VAT",
  both: "Both",
};

// HubSpot date properties take a plain YYYY-MM-DD date.
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

function bestScoresText(best: Record<string, number>) {
  return Object.entries(best)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([key, score]) => `${key.replace("shift_", "Shift ")}: ${score}`)
    .join(", ");
}

async function referrerEmail(id: string | null): Promise<string> {
  if (!id) return "";
  const url = `${Deno.env.get("SUPABASE_URL")}/rest/v1/players?id=eq.${encodeURIComponent(id)}&select=email`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const res = await fetch(url, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) return "";
  const rows = (await res.json()) as { email: string }[];
  return rows[0]?.email ?? "";
}

async function toProperties(p: Player): Promise<Record<string, string>> {
  return {
    email: p.email,
    oblique_play_player: "true",
    oblique_play_display_name: p.display_name ?? "",
    oblique_play_role: p.role ?? "",
    // Business owners are flagged for the free 30-minute diagnostic.
    oblique_play_diagnostic_flag: String(p.role === "business_owner"),
    oblique_play_source: p.source,
    oblique_play_referred_by: await referrerEmail(p.referred_by),
    oblique_play_modules: p.modules_played.map((m) => LABELS[m] ?? m).join(", "),
    oblique_play_quiz_tracks: p.quiz_tracks_played.map((t) => LABELS[t] ?? t).join(", "),
    oblique_play_shifts_completed: String(p.shifts_completed),
    oblique_play_best_scores: bestScoresText(p.best_scores),
    oblique_play_current_streak: String(p.current_streak),
    oblique_play_marketing_consent: String(p.marketing_consent),
    oblique_play_marketing_consent_date: day(p.marketing_consent_at),
    oblique_play_signup_date: day(p.created_at),
    // The player tapped "Book a free diagnostic": a warm lead.
    oblique_play_diagnostic_requested: day(p.diagnostic_clicked_at),
    oblique_play_prize_entered: day(p.prize_entered_at),
  };
}

// Fields that matter to HubSpot; other column changes don't trigger a sync.
const SYNCED: (keyof Player)[] = [
  "email", "display_name", "role", "source", "referred_by", "marketing_consent",
  "modules_played", "quiz_tracks_played", "shifts_completed", "best_scores", "current_streak",
  "diagnostic_clicked_at", "prize_entered_at",
];

Deno.serve(async (req) => {
  if (req.headers.get("x-webhook-secret") !== Deno.env.get("WEBHOOK_SECRET")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await req.json()) as WebhookPayload;
  const player = payload.record;
  if (payload.table !== "players" || !player || payload.type === "DELETE") {
    return new Response("Ignored", { status: 200 });
  }
  const old = payload.old_record;
  if (old && SYNCED.every((k) => JSON.stringify(old[k]) === JSON.stringify(player[k]))) {
    return new Response("No change", { status: 200 });
  }

  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("HUBSPOT_ACCESS_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: [{ idProperty: "email", id: player.email, properties: await toProperties(player) }],
    }),
  });

  if (!res.ok) {
    // A non-2xx reply makes the webhook log the failure for follow-up.
    const detail = await res.text();
    console.error("HubSpot sync failed", res.status, detail);
    return new Response("HubSpot sync failed", { status: 502 });
  }
  return new Response("Synced", { status: 200 });
});
