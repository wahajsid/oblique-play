import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

// Keeps the player's sign-in fresh: on each page request it refreshes the
// session token if needed and writes the new cookie back.
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!authEnabled) return rememberSource(request, response);

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });
  await supabase.auth.getClaims();
  return rememberSource(request, response);
}

// Keeps the first ?utm_source= of a visit (e.g. "website" or "linkedin")
// for 30 days, so the sign-in page can record where a new player came from
// even after they've clicked around.
function rememberSource(request: NextRequest, response: NextResponse) {
  const utm = request.nextUrl.searchParams.get("utm_source")?.replace(/[^\w.-]/g, "").slice(0, 40);
  if (utm && !request.cookies.has("ob_src")) {
    response.cookies.set("ob_src", utm, {
      maxAge: 60 * 60 * 24 * 30,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: request.nextUrl.protocol === "https:",
    });
  }
  return response;
}

export const config = {
  // Skip static files and images.
  matcher: ["/((?!_next/static|_next/image|fonts/|icon.png|apple-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)"],
};
