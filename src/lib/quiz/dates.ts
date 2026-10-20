// Dates for the daily quiz follow the UAE calendar. The UAE is UTC+4 all
// year (no daylight saving), so a new set starts at 20:00 UTC.

const UAE_OFFSET_MS = 4 * 60 * 60 * 1000;

export function uaeToday(now = Date.now()): string {
  return new Date(now + UAE_OFFSET_MS).toISOString().slice(0, 10);
}

// Milliseconds until the next set goes live (midnight UAE time).
export function msUntilNextSet(now = Date.now()): number {
  const uae = now + UAE_OFFSET_MS;
  const nextMidnight = Math.floor(uae / 86_400_000 + 1) * 86_400_000;
  return nextMidnight - uae;
}

export function isIsoDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

// "Tue 3 Nov"
export function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

// "3 Nov 2026"
export function longDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}
