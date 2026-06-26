/**
 * pdf-browser.ts — launches a Chromium instance for PDF rendering.
 *
 * Works in two environments:
 *  - Local/dev: uses the full `puppeteer` package (bundles its own Chromium).
 *  - Serverless (Vercel/AWS Lambda): uses `puppeteer-core` + `@sparticuz/chromium-min`,
 *    downloading the Chromium binary from a remote pack URL at runtime. This
 *    avoids bundling the ~64MB binary, which Turbopack/webpack relocate and break
 *    (the classic "input directory .../bin does not exist" error).
 *
 * Both code paths return a Puppeteer-compatible Browser instance.
 */

import type { Browser } from 'puppeteer-core'

// Vercel and AWS Lambda set these; locally they are undefined.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

// Remote Chromium pack matching the installed @sparticuz/chromium-min version.
// Overridable via env in case the version/host changes.
const CHROMIUM_PACK_URL =
  process.env.CHROMIUM_PACK_URL ||
  'https://github.com/Sparticuz/chromium/releases/download/v149.0.0/chromium-v149.0.0-pack.x64.tar'

export async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    // Serverless: puppeteer-core driven by @sparticuz/chromium-min.
    // executablePath(url) downloads + extracts the binary to /tmp on cold start.
    const [{ default: chromium }, puppeteer] = await Promise.all([
      import('@sparticuz/chromium-min'),
      import('puppeteer-core'),
    ])

    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    }) as unknown as Browser
  }

  // Local/dev: full puppeteer with its bundled Chromium.
  const puppeteer = await import('puppeteer')
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }) as unknown as Browser
}
