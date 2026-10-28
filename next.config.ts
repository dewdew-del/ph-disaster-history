import type { NextConfig } from "next";

// Fully static site: `next build` writes plain HTML/JS/JSON to `out/`.
// No server, no API routes, no image optimization service.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
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
