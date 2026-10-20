import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DiagnosticOffer } from "@/components/offers/DiagnosticOffer";
import { ProfileCard } from "@/components/ProfileCard";
import { SiteFooter } from "@/components/SiteFooter";
import { getProfile } from "@/lib/players";
import { authEnabled } from "@/lib/supabase/config";

export const metadata = { title: "Your profile · by Oblique" };

export default async function ProfilePage() {
  if (!authEnabled) redirect("/");
  const profile = await getProfile();
  if (!profile) redirect("/signin?next=/profile");
  return (
    <>
      <AppHeader back={{ href: "/", label: "Home" }} />
      <main className="flex-1 px-4 pt-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted">Signed in as {profile.email}</p>
        <ProfileCard profile={profile} mode="edit" />
        {profile.role === "business_owner" && <DiagnosticOffer />}
        <p className="mt-6 text-sm text-muted">
          To get a copy of your data or have it deleted, email{" "}
          <a href="mailto:privacy@obliqueconsult.com" className="underline underline-offset-2">
            privacy@obliqueconsult.com
          </a>
          .
        </p>
        <form action="/auth/signout" method="post" className="mt-4 pb-6">
          <button type="submit" className="min-h-12 w-full rounded-full border border-line text-sm font-semibold">
            Sign out
          </button>
        </form>
      </main>
      <SiteFooter />
    </>
  );
}
