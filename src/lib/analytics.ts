// Analytics with PostHog. Nothing loads, and nothing is sent, until
// NEXT_PUBLIC_POSTHOG_KEY is set (docs/SETUP.md). Players are identified by
// their player id, never by email.
//
// The events, so reports can be built on them:
//   sample_started, sample_finished        the no-sign-in sample round
//   signin_code_requested                  an email was entered on the sign-in form
//   signin_linkedin_started                "Continue with LinkedIn" was tapped
//   quiz_started, quiz_finished            { track, date, scored, score }
//   result_copied, share_opened            sharing from a results screen
//   profile_saved                          { has_company, role }
//   offer_clicked                          { topic } the free-call offer
//   report_sent                            { kind, reason }
//   prize_entered
import posthog from "posthog-js";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";
let started = false;

export const analyticsEnabled = Boolean(KEY);

export function startAnalytics(playerId: string | null) {
  if (!KEY || typeof window === "undefined") return;
  if (!started) {
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: "history_change",
      capture_exceptions: true,
      person_profiles: "identified_only",
      autocapture: false,
    });
    started = true;
  }
  if (playerId) posthog.identify(playerId);
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  if (!KEY || !started) return;
  try {
    posthog.capture(event, properties);
  } catch {}
}

export function reportError(error: unknown) {
  if (!KEY || !started) return;
  try {
    posthog.captureException(error);
  } catch {}
}
