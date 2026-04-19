import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  basePath: "/mission-control",
  poweredByHeader: false,
  turbopack: {
    root,
  },
  experimental: {
    serverActions: {
      // Allow Server Actions from any origin — needed because nginx strips the
      // port from the Host header, causing a mismatch with the browser's origin
      // header (especially via the OpsPocket SSH tunnel on 127.0.0.1:<port>).
      allowedOrigins: ["*"],
    },
  },
};

export default nextConfig;
