import { SampleQuiz } from "@/components/quiz/SampleQuiz";
import { PRIZE_GIFTS, prizesRunning } from "@/lib/prizes";
import { getSampleQuestions } from "@/lib/quiz/content";

export const metadata = {
  title: "Try 5 UAE tax questions · by Oblique",
  description: "Five sample questions from Oblique's free UAE tax game. No sign-in needed.",
};

// Whether a prize is running depends on today's date, so it's built per visit.
export const dynamic = "force-dynamic";

// A taste of the daily quiz for anyone, before they're asked for an email.
// The five questions are fixed and already public, so nothing here helps
// with the day's scored quizzes.
export default function SamplePage() {
  return <SampleQuiz questions={getSampleQuestions()} prize={prizesRunning() ? PRIZE_GIFTS[0] : null} />;
}
