import type { NextConfig } from "next";

export default {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: { "/api": ["./node_modules/@sparticuz/chromium/bin/**"] },
} satisfies NextConfig;
