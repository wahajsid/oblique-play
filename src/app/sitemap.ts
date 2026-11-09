import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/config";

// The public pages worth finding in a search.
export default function sitemap(): MetadataRoute.Sitemap {
  const daily = ["", "/quiz", "/spot-the-error", "/quiz/sample"];
  const rarely = ["/review", "/prizes/rules", "/privacy", "/terms"];
  return [
    ...daily.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "daily" as const })),
    ...rarely.map((path) => ({ url: `${siteUrl}${path}`, changeFrequency: "monthly" as const })),
  ];
}
