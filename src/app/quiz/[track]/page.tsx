import { notFound, redirect } from "next/navigation";
import { isPlayTrack } from "@/lib/quiz/content";
import { uaeToday } from "@/lib/quiz/dates";

// /quiz/ct goes to today's set, with the date in the address so a shared
// link always opens the same questions.
export const dynamic = "force-dynamic";

export default async function TodayRedirect({ params }: { params: Promise<{ track: string }> }) {
  const { track } = await params;
  if (!isPlayTrack(track)) notFound();
  redirect(`/quiz/${track}/${uaeToday()}`);
}
