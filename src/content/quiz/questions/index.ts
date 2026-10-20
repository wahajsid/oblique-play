// Every quiz question file, so the app bundles them. When you add a file
// here, `npm run check:quiz` confirms nothing is missing.
import type { QuizQuestion } from "@/lib/quiz/types";
import ctPassdrill from "./ct-passdrill.json";
import ctBatch01 from "./ct-batch-01.json";
import ctBatch02 from "./ct-batch-02.json";
import ctBatch03 from "./ct-batch-03.json";
import vatPassdrill from "./vat-passdrill.json";
import vatBatch01 from "./vat-batch-01.json";
import vatBatch02 from "./vat-batch-02.json";
import vatBatch03 from "./vat-batch-03.json";

export const allQuestions = [
  ...ctPassdrill,
  ...ctBatch01,
  ...ctBatch02,
  ...ctBatch03,
  ...vatPassdrill,
  ...vatBatch01,
  ...vatBatch02,
  ...vatBatch03,
] as QuizQuestion[];
