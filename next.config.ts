import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-hosted on the homelab, so we ship a minimal standalone server.
  output: "standalone",
  experimental: {
    // phone photos are bigger than the 1 MB server action default
    serverActions: { bodySizeLimit: "10mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
