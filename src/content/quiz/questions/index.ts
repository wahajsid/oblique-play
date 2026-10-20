// Every quiz question file, so the app bundles them. When you add a file
// here, `npm run check:quiz` confirms nothing is missing.
import type { QuizQuestion } from "@/lib/quiz/types";
import ctPassdrill from "./ct-passdrill.json";
import ctBatch01 from "./ct-batch-01.json";
import vatPassdrill from "./vat-passdrill.json";
import vatBatch01 from "./vat-batch-01.json";

export const allQuestions = [...ctPassdrill, ...ctBatch01, ...vatPassdrill, ...vatBatch01] as QuizQuestion[];
