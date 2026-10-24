import type { NextConfig } from "next";

// Only /embed pages may be shown inside another site (obliqueconsult.com on
// Framer). Everything else refuses to be framed, so no other site can wrap
// the game and trick players into tapping things.
const EMBED_HOSTS = "https://obliqueconsult.com https://*.obliqueconsult.com https://*.framer.app https://*.framer.website https://framer.com https://*.framer.com";

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/((?!embed/).*)", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors 'none'" }] },
      { source: "/embed/:path*", headers: [{ key: "Content-Security-Policy", value: `frame-ancestors 'self' ${EMBED_HOSTS}` }] },
    ];
  },
};

export default nextConfig;
