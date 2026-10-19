import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled, safeNextPath } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Sign in · by Oblique" };

type Search = { next?: string; src?: string; utm_source?: string; ref?: string };

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (!authEnabled || (await getSignedInPlayer())) redirect(next);

  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex flex-1 flex-col px-4 pt-6">
        <SignInForm next={next} source={params.src ?? params.utm_source ?? "direct"} referredBy={params.ref ?? ""} />
      </main>
      <SiteFooter />
    </>
  );
}
