import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  images: {
    // Allow public assets (and optional query strings) for next/image
    localPatterns: [{ pathname: "/**" }],
  },
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.svg": {
        type: "asset",
      },
    },
  },
  // Ensure SVG imports resolve to URL strings for PixelIcons mask usage
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/i,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
