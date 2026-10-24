import { NextResponse, type NextRequest } from "next/server";

// A player's invite link, e.g. play.obliqueconsult.com/i/k7m2qx9a.
// Remembers who invited this visitor for 30 days, then opens the home page.
// The sign-in page passes the code on, and the database credits the referrer
// when the new player's account is created.
export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const response = NextResponse.redirect(new URL("/", request.url));
  if (/^[a-z2-9]{8}$/i.test(code)) {
    const options = { maxAge: 60 * 60 * 24 * 30, httpOnly: true, sameSite: "lax" as const, path: "/", secure: request.nextUrl.protocol === "https:" };
    response.cookies.set("ob_ref", code.toLowerCase(), options);
    if (!request.cookies.has("ob_src")) response.cookies.set("ob_src", "invite", options);
  }
  return response;
}
