// Every quiz question file, so the app bundles them. When you add a file
// here, `npm run check:quiz` confirms nothing is missing.
import type { QuizQuestion } from "@/lib/quiz/types";
import ctPassdrill from "./ct-passdrill.json";
import ctBatch01 from "./ct-batch-01.json";
import ctBatch02 from "./ct-batch-02.json";
import ctBatch03 from "./ct-batch-03.json";
import ctBatch04 from "./ct-batch-04.json";
import ctBatch05 from "./ct-batch-05.json";
import vatPassdrill from "./vat-passdrill.json";
import vatBatch01 from "./vat-batch-01.json";
import vatBatch02 from "./vat-batch-02.json";
import vatBatch03 from "./vat-batch-03.json";
import vatBatch04 from "./vat-batch-04.json";
import vatBatch05 from "./vat-batch-05.json";

export const allQuestions = [
  ...ctPassdrill,
  ...ctBatch01,
  ...ctBatch02,
  ...ctBatch03,
  ...ctBatch04,
  ...ctBatch05,
  ...vatPassdrill,
  ...vatBatch01,
  ...vatBatch02,
  ...vatBatch03,
  ...vatBatch04,
  ...vatBatch05,
] as QuizQuestion[];
