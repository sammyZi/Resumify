/**
 * route.ts — GET /api/share-pdf/:token  (public)
 *
 * Generates a clean, clickable-link PDF for a recruiter share link. No auth —
 * access is gated by the opaque share token. Returns 404 for revoked, missing,
 * or non-recruiter shares.
 */

import type { NextRequest } from 'next/server'
import { resolveShare } from '@/lib/services/share-service'
import { buildResumeHtml } from '@/lib/templates/build-resume-html'
import { getTemplateMeta } from '@/lib/templates/registry'
import { launchBrowser } from '@/lib/templates/pdf-browser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const resolved = await resolveShare(token)
  if (!resolved.ok || resolved.value.share.kind !== 'recruiter' || !resolved.value.resumeData) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const { resumeData, templateId } = resolved.value
  const template = getTemplateMeta(templateId)
  const html = buildResumeHtml(template, resumeData)

  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      tagged: true,
    })

    const name = (resumeData.fullName || 'resume').replace(/[^a-z0-9]/gi, '-').toLowerCase()

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${name}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } finally {
    await browser.close()
  }
}
