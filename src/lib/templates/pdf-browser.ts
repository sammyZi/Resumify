/**
 * pdf-browser.ts — launches a Chromium instance for PDF rendering.
 *
 * Works in two environments:
 *  - Local/dev: uses the full `puppeteer` package (bundles its own Chromium).
 *  - Serverless (Vercel/AWS Lambda): uses `puppeteer-core` + `@sparticuz/chromium`,
 *    since the full Chromium binary from `puppeteer` is not available and
 *    exceeds the function size limit in those runtimes.
 *
 * Both code paths return a Puppeteer-compatible Browser instance.
 */

import type { Browser } from 'puppeteer-core'

// Vercel and AWS Lambda set these; locally they are undefined.
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)

export async function launchBrowser(): Promise<Browser> {
  if (isServerless) {
    // Serverless: puppeteer-core driven by @sparticuz/chromium.
    const [{ default: chromium }, puppeteer] = await Promise.all([
      import('@sparticuz/chromium'),
      import('puppeteer-core'),
    ])

    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
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
