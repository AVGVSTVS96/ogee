import type { NextConfig } from "next";

export default {
  serverExternalPackages: ["ffmpeg-static", "@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: { "/api": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/ffmpeg-static/ffmpeg"] },
} satisfies NextConfig;
