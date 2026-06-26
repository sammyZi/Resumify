import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "pdf.js-extract",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium-min",
  ],
};

export default nextConfig;
