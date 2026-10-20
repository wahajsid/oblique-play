import { redirect } from "next/navigation";
import { challengeGamePath, getChallenge } from "@/lib/challenges";
import { getSignedInPlayer } from "@/lib/supabase/server";

// "Take the challenge": sign in first if needed (keeping who sent it), then
// open the same shift or quiz set with the challenge attached.
// A page rather than a route handler, so the redirect also works when the
// app navigates here after sign-in.
export default async function PlayChallenge({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const challenge = await getChallenge(code);
  if (!challenge) redirect("/");

  if (!(await getSignedInPlayer())) {
    // The path after sign-in has no query string, because the sign-in email
    // inserts it into a link unencoded (see supabase/templates/sign-in.html).
    const q = new URLSearchParams({ next: `/c/${code}/play`, src: "challenge", ref: challenge.creatorId });
    redirect(`/signin?${q}`);
  }
  redirect(challengeGamePath(challenge));
}
