import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/supabase/config";

// Search engines may list the public pages. Personal pages, sign-in and the
// behind-the-scenes addresses are left out. A test copy (NOINDEX=true) asks
// to be left out entirely.
export default function robots(): MetadataRoute.Robots {
  if (process.env.NOINDEX === "true") return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/signin", "/profile", "/embed/", "/slides/", "/i/", "/diagnostic"] },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
