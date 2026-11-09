"use client";

import { useEffect } from "react";
import { startAnalytics } from "@/lib/analytics";

// Starts analytics once the page has loaded. Renders nothing.
export function Analytics({ playerId }: { playerId: string | null }) {
  useEffect(() => startAnalytics(playerId), [playerId]);
  return null;
}
