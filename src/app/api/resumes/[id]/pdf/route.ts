/**
 * route.ts — GET /api/resumes/:id/pdf
 *
 * Generates a clean, server-side PDF of the resume using Puppeteer:
 *  - No browser chrome, headers, footers or URLs
 *  - All links (email, phone, socials, project links) are clickable
 *  - Exactly US-Letter dimensions (8.5in × 11in)
 *
 * Requires an authenticated session. Unauthenticated requests receive 401.
 * Ownership is enforced via Supabase RLS on getResume.
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { buildResumeHtml } from '@/lib/templates/build-resume-html'
import { getTemplateMeta } from '@/lib/templates/registry'
import { launchBrowser } from '@/lib/templates/pdf-browser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── 2. Load resume ─────────────────────────────────────────────────────────
  const { id } = await params
  const resumeResult = await getResume(id)
  if (!resumeResult.ok) {
    const status = resumeResult.error.kind === 'not_found' ? 404 : 500
    return Response.json({ error: resumeResult.error.kind }, { status })
  }
  const resume = resumeResult.value

  // ── 3. Build standalone HTML ────────────────────────────────────────────────
  const template = getTemplateMeta(resume.templateId)
  const html = buildResumeHtml(template, {
    fullName: resume.fullName,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    summary: resume.summary,
    links: resume.links,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    skills: resume.skills,
    achievements: resume.achievements,
  })

  // ── 4. Render to PDF with Puppeteer ─────────────────────────────────────────
  // launchBrowser() picks full puppeteer locally and @sparticuz/chromium on Vercel.
  const browser = await launchBrowser()

  try {
    const page = await browser.newPage()

    // Set content directly — no network round-trip needed.
    await page.setContent(html, { waitUntil: 'load' })

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      // Tagged PDF preserves link annotations.
      tagged: true,
    })

    const name = (resume.fullName || 'resume').replace(/[^a-z0-9]/gi, '-').toLowerCase()

    return new Response(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name}.pdf"`,
        'Cache-Control': 'no-store',
      },
    })
  } finally {
    await browser.close()
  }
}
