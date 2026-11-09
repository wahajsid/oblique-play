import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { linkedInEnabled, safeNextPath, siteUrl } from "@/lib/supabase/config";
import { createAdminClient, createClient } from "@/lib/supabase/server";

// LinkedIn sends the player back here after they approve the sign-in.
// The one-time code in the address is swapped for a signed-in session, then
// a brand-new player's details (kept in a cookie by the sign-in page) are
// written to their record. Anything that goes wrong returns the player to
// the sign-in page with a plain message; email sign-in always still works.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNextPath(params.get("next"));
  const back = NextResponse.redirect(`${siteUrl}/signin?error=linkedin&next=${encodeURIComponent(next)}`);
  const code = params.get("code");
  if (!linkedInEnabled || !code || params.get("error")) return back;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) return back;

  const jar = await cookies();
  let details: { t?: string; m?: boolean; s?: string; r?: string } = {};
  try {
    details = JSON.parse(jar.get("ob_signup")?.value ?? "{}");
  } catch {
    // A damaged cookie just means no extra details.
  }
  jar.delete({ name: "ob_signup", path: "/auth" });

  const termsAt = typeof details.t === "string" && !Number.isNaN(Date.parse(details.t)) ? details.t : null;
  const { error: saveError } = await createAdminClient().rpc("apply_signup_details", {
    p_player: data.user.id,
    p_source: typeof details.s === "string" ? details.s : jar.get("ob_src")?.value ?? "direct",
    p_referred_by: typeof details.r === "string" ? details.r : jar.get("ob_ref")?.value ?? "",
    p_terms_at: termsAt,
    p_marketing: details.m === true,
  });
  // The player is signed in either way; a failure here only loses the extras.
  if (saveError) console.error("apply_signup_details failed", saveError.message);

  return NextResponse.redirect(`${siteUrl}${next}`);
}
