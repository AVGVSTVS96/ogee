import type { NextConfig } from "next";

export default {
  serverExternalPackages: ["ffmpeg-static", "@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
} satisfies NextConfig;
