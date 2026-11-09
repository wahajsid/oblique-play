import { NextResponse } from "next/server";
import { getDailySet } from "@/lib/quiz/content";
import { uaeToday } from "@/lib/quiz/dates";
import { authEnabled } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/server";

// GET /api/health
// For an uptime monitor: 200 when the game can reach its database and has a
// quiz for today, 503 otherwise. Says nothing about players.
export const dynamic = "force-dynamic";

export async function GET() {
  const today = uaeToday();
  let database = !authEnabled;
  if (authEnabled) {
    const { error } = await createAdminClient().from("players").select("id", { count: "exact", head: true });
    database = !error;
  }
  const quizToday = !!getDailySet(today);
  const ok = database && quizToday;
  return NextResponse.json({ ok, database, quizToday, date: today }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
