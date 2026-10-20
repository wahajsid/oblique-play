import { notFound } from "next/navigation";
import { DailyGame } from "@/components/review/DailyGame";
import { uaeToday } from "@/lib/quiz/dates";
import { getDailyDocument } from "@/lib/review/content";
import { getDailyResult } from "@/lib/review/record";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";

export const metadata = { title: "Today's document · by Oblique" };
// Changes at midnight UAE time, so it's built per request.
export const dynamic = "force-dynamic";

export default async function DailyPage() {
  const date = uaeToday();
  const doc = getDailyDocument(date);
  if (!doc) notFound();
  const [player, doneToday] = await Promise.all([getSignedInPlayer(), getDailyResult(date)]);
  return <DailyGame key={date} date={date} doc={doc} needsSignIn={authEnabled && !player} doneToday={doneToday} />;
}
