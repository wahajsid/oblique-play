import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled, safeNextPath } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Confirm sign-in · by Oblique" };

// The sign-in email's button lands here.
//
// Why a second tap: company email systems (such as Microsoft Safe Links)
// open every link in an email to scan it. If opening the link signed the
// player in, the scanner would use up the one-time token and the player's
// code would stop working. Scanners open links but don't press buttons, so
// the token is only used when a person taps "Confirm sign-in".

type Search = { token_hash?: string; type?: string; next?: string; error?: string };

async function confirm(formData: FormData) {
  "use server";
  const tokenHash = String(formData.get("token_hash") ?? "");
  const next = safeNextPath(String(formData.get("next") ?? "/"));
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
  if (error) redirect(`/auth/confirm?error=expired&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (!authEnabled) redirect(next);

  const failed = params.error || !params.token_hash;

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 flex-col px-4 pt-6">
        {failed ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">This link has expired</h1>
            <p className="mt-2 text-base text-muted">
              Sign-in links work once and expire after an hour. Ask for a new code and you&apos;ll be straight back in.
            </p>
            <div className="mt-auto pt-8 pb-safe">
              <a
                href={`/signin?next=${encodeURIComponent(next)}`}
                className="flex min-h-14 items-center justify-center rounded-full btn-primary px-4 text-base font-semibold"
              >
                Get a new code
              </a>
            </div>
          </>
        ) : (
          <form action={confirm} className="flex flex-1 flex-col">
            <h1 className="text-3xl font-semibold tracking-tight">One tap to sign in</h1>
            <p className="mt-2 text-base text-muted">Confirm it&apos;s you and we&apos;ll take you to the game.</p>
            <input type="hidden" name="token_hash" value={params.token_hash} />
            <input type="hidden" name="next" value={next} />
            <div className="mt-auto pt-8 pb-safe">
              <button type="submit" className="min-h-14 w-full rounded-full btn-primary px-4 text-base font-semibold">
                Confirm sign-in
              </button>
            </div>
          </form>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
