import { notFound } from "next/navigation";
import { QuizGame } from "@/components/quiz/QuizGame";
import { getDailySet, getPlayIds, getPublicQuestions, hasDrafts, isPlayTrack, TRACKS } from "@/lib/quiz/content";
import { longDate, uaeToday } from "@/lib/quiz/dates";
import { getScoredState } from "@/lib/quiz/record";
import { authEnabled } from "@/lib/supabase/config";
import { getSignedInPlayer } from "@/lib/supabase/server";

type Params = { track: string; date: string };

export default async function QuizPage({ params }: { params: Promise<Params> }) {
  const { track, date } = await params;
  if (!isPlayTrack(track)) notFound();
  // getDailySet returns nothing for future dates, so tomorrow stays private.
  const day = getDailySet(date);
  if (!day) notFound();

  const ids = getPlayIds(day, track);
  const [player, serverScored] = await Promise.all([getSignedInPlayer(), getScoredState(track, date)]);

  // Only the answer-free version of each question is sent to the browser.
  return (
    <QuizGame
      key={`${track}:${date}`}
      track={track}
      trackTitle={TRACKS[track].title}
      date={date}
      isToday={date === uaeToday()}
      questions={getPublicQuestions(ids)}
      needsSignIn={authEnabled && !player}
      signedIn={!!player}
      draft={hasDrafts(ids)}
      serverScored={serverScored}
    />
  );
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { track, date } = await params;
  if (!isPlayTrack(track)) return { title: "Daily quiz · by Oblique" };
  return { title: `${TRACKS[track].title} quiz, ${longDate(date)} · by Oblique` };
}
