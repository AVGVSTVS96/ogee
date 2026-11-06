import type { NextConfig } from "next";

export default {
  images: { remotePatterns: [{ hostname: "*.public.blob.vercel-storage.com", protocol: "https" }] },
  serverExternalPackages: ["ffmpeg-static", "@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/ffmpeg-static/ffmpeg",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
} satisfies NextConfig;
