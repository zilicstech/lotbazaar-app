import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image. The workspace root is the tracing root so hoisted node_modules are included.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Same-origin API calls; the Spring backend serves /api on 8080.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:8080"}/api/:path*` }];
  },
};

export default nextConfig;
