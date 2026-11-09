"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authEnabled, linkedInEnabled, safeNextPath, siteUrl } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { ok: boolean; error?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Step 1: email the player a code (and a backup sign-in link).
// Supabase creates the account the first time an email is used.
export async function requestCode(input: {
  email: string;
  acceptedTerms: boolean;
  marketing: boolean;
  next: string;
  source: string;
  ref: string;
}): Promise<SignInState> {
  if (!authEnabled) return { ok: false, error: "Sign-in isn't switched on yet." };
  const email = input.email.trim().toLowerCase();
  if (!EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (!input.acceptedTerms) return { ok: false, error: "Please agree to the terms and privacy notice to continue." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // The email's button opens /auth/confirm, which asks for one more tap
      // before signing in (see that page for why).
      emailRedirectTo: `${siteUrl}${safeNextPath(input.next)}`,
      // Stored with a new account and copied to the player record once the
      // email is confirmed. Ignored for existing accounts.
      data: {
        terms_accepted_at: new Date().toISOString(),
        marketing_consent: input.marketing,
        source: input.source.slice(0, 40) || "direct",
        referred_by: input.ref.slice(0, 40),
      },
    },
  });

  if (error) return { ok: false, error: friendlyError(error.status, error.message) };
  return { ok: true };
}

// Step 2: check the code the player typed in.
export async function verifyCode(input: { email: string; code: string; marketing: boolean; next: string }) {
  if (!authEnabled) return { ok: false, error: "Sign-in isn't switched on yet." } satisfies SignInState;
  const token = input.code.replace(/\D/g, "");
  if (token.length < 6) return { ok: false, error: "Enter the 6-digit code from the email." } satisfies SignInState;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: input.email.trim().toLowerCase(),
    token,
    type: "email",
  });
  if (error || !data.user) {
    return { ok: false, error: friendlyError(error?.status, error?.message ?? "") } satisfies SignInState;
  }

  // A returning player who ticks the box now has given consent today.
  if (input.marketing) {
    await supabase.from("players").update({ marketing_consent: true }).eq("id", data.user.id).eq("marketing_consent", false);
  }

  redirect(safeNextPath(input.next));
}

// The other way in: "Continue with LinkedIn". The player is sent to LinkedIn
// to approve, and comes back to /auth/callback. The details a new player
// record needs (terms, marketing tick, where they came from, who invited
// them) wait in a short-lived cookie that only /auth/callback can read.
export async function startLinkedIn(input: {
  acceptedTerms: boolean;
  marketing: boolean;
  next: string;
  source: string;
  ref: string;
}): Promise<SignInState> {
  if (!linkedInEnabled) return { ok: false, error: "LinkedIn sign-in isn't switched on yet." };
  if (!input.acceptedTerms) return { ok: false, error: "Please agree to the terms and privacy notice to continue." };

  const next = safeNextPath(input.next);
  const jar = await cookies();
  jar.set(
    "ob_signup",
    JSON.stringify({
      t: new Date().toISOString(),
      m: input.marketing,
      s: input.source.slice(0, 40) || "direct",
      r: input.ref.slice(0, 40),
    }),
    { httpOnly: true, sameSite: "lax", secure: siteUrl.startsWith("https:"), maxAge: 600, path: "/auth" },
  );

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "linkedin_oidc",
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: "We couldn't reach LinkedIn just now. Try again, or use your email." };
  redirect(data.url);
}

function friendlyError(status: number | undefined, message: string): string {
  if (status === 429 || /rate limit|security purposes/i.test(message)) {
    return "Please wait a minute before asking for another code.";
  }
  if (/expired|invalid/i.test(message)) {
    return "That code didn't work. Check it, or ask for a new one.";
  }
  return "Something went wrong on our side. Please try again.";
}
