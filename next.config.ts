import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "pdf.js-extract",
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  // Force the @sparticuz/chromium binary (bin/*.br) into the serverless function
  // bundle for the PDF routes. Without this, the file tracer omits the binary
  // and Chromium fails to launch on Vercel ("input directory ... does not exist").
  outputFileTracingIncludes: {
    "/api/share-pdf/[token]": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/api/resumes/[id]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
