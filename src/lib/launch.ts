import "server-only";

import { DAILY_START } from "@/lib/review/content";

// Launch day, 3 Nov 2026. The public website pages and boxes show "coming
// soon" before it, so the launch-day document stays private.
// LAUNCH_PREVIEW=true shows the launched versions anyway, for checking them
// before launch (never set it in Vercel).
export const LAUNCH_DATE = DAILY_START;

export function isLaunched(today: string): boolean {
  return today >= LAUNCH_DATE || process.env.LAUNCH_PREVIEW === "true";
}
