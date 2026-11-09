import type { NextConfig } from "next";

// Only /embed pages may be shown inside another site (obliqueconsult.com on
// Framer). Everything else refuses to be framed, so no other site can wrap
// the game and trick players into tapping things.
const EMBED_HOSTS = "https://obliqueconsult.com https://*.obliqueconsult.com https://*.framer.app https://*.framer.website https://framer.com https://*.framer.com";

// Sent with every page: always use HTTPS, don't guess file types, don't leak
// full addresses to other sites, and no access to camera, microphone or location.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      { source: "/((?!embed/).*)", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${EMBED_HOSTS}` }] },
      // A test copy (NOINDEX=true) asks search engines not to list any page.
      ...(process.env.NOINDEX === "true" ? [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }] : []),
    ];
  },
};

export default nextConfig;
