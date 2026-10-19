import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { authEnabled, supabasePublishableKey, supabaseUrl } from "./config";

// A Supabase client acting as the signed-in player. Row-level security in
// the database limits it to that player's own rows.
// Create a new one per request; never share it between requests.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a page render, where cookies can't be written.
          // The middleware refreshes the session instead.
        }
      },
    },
  });
}

// A client with full database access, used only on the server for writes a
// player must not be able to forge (such as marking their own answers).
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) throw new Error("SUPABASE_SECRET_KEY is not set");
  return createSupabaseClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SignedInPlayer = { id: string; email: string };

// The signed-in player, or null. getClaims() verifies the session token
// rather than trusting the cookie as-is.
export async function getSignedInPlayer(): Promise<SignedInPlayer | null> {
  if (!authEnabled) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || typeof claims.email !== "string") return null;
  return { id: claims.sub, email: claims.email };
}
