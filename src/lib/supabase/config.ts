// Supabase settings come from environment variables (set in Vercel, and in
// .env.local when running on a laptop). See docs/SETUP.md.
//
// Until they're set, the game runs without sign-in and keeps progress on
// the device only. That keeps local development and previews working.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const authEnabled = Boolean(supabaseUrl && supabasePublishableKey);

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://play.obliqueconsult.com").replace(/\/$/, "");

// Only same-site paths are allowed as a destination after sign-in, so a
// crafted link can't bounce players to another website.
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return "/";
  try {
    const url = new URL(next, siteUrl);
    if (url.origin !== new URL(siteUrl).origin) return "/";
    return `${url.pathname}${url.search}` || "/";
  } catch {
    return "/";
  }
}
