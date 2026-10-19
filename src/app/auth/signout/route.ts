import { NextResponse } from "next/server";
import { authEnabled } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

// POST only, so a link preview or prefetch can't sign a player out.
export async function POST(request: Request) {
  if (authEnabled) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
