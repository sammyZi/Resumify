/**
 * route.ts — GET/POST /api/resumes/:id/pdf
 *
 * Generates a clean, server-side PDF of the resume using Puppeteer:
 *  - No browser chrome, headers, footers or URLs
 *  - All links (email, phone, socials, project links) are clickable
 *  - Exactly US-Letter dimensions (8.5in × 11in)
 *
 * GET  — authenticated: loads the resume from the DB by id.
 * POST — demo mode: no session; the client supplies { data, templateId } in the
 *        body along with an `x-demo-mode` header. This produces the exact same
 *        clickable-link PDF for locally-stored (demo) resumes.
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { buildResumeHtml } from '@/lib/templates/build-resume-html'
import { getTemplateMeta } from '@/lib/templates/registry'
import { launchBrowser } from '@/lib/templates/pdf-browser'
import type { ResumeData } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── Shared renderer ────────────────────────────────────────────────────────

async function renderPdf(templateId: string | null, data: ResumeData): Promise<Uint8Array> {
  const template = getTemplateMeta(templateId)
  const html = buildResumeHtml(template, data)

  const browser = await launchBrowser()
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'load' })
    return await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      tagged: true,
    })
  } finally {
    await browser.close()
  }
}

function pdfResponse(buffer: Uint8Array, fullName: string): Response {
  const name = (fullName || 'resume').replace(/[^a-z0-9]/gi, '-').toLowerCase()
  return new Response(Buffer.from(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${name}.pdf"`,
      'Cache-Control': 'no-store',
    },
  })
}

// ─── GET (authenticated) ──────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const resumeResult = await getResume(id)
  if (!resumeResult.ok) {
    const status = resumeResult.error.kind === 'not_found' ? 404 : 500
    return Response.json({ error: resumeResult.error.kind }, { status })
  }
  const resume = resumeResult.value

  const buffer = await renderPdf(resume.templateId, {
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

  return pdfResponse(buffer, resume.fullName)
}

// ─── POST (demo — client-supplied data) ───────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isDemo = request.headers.get('x-demo-mode') === '1'
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isDemo) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const clientData = body?.data as ResumeData | undefined
  const templateId = typeof body?.templateId === 'string' ? body.templateId : null

  let data: ResumeData
  if (isDemo && clientData && typeof clientData === 'object') {
    data = clientData
  } else {
    // Authenticated fallback: load from DB by id.
    const { id } = await params
    const resumeResult = await getResume(id)
    if (!resumeResult.ok) {
      const status = resumeResult.error.kind === 'not_found' ? 404 : 500
      return Response.json({ error: resumeResult.error.kind }, { status })
    }
    const resume = resumeResult.value
    data = {
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
    }
    const buffer = await renderPdf(resume.templateId, data)
    return pdfResponse(buffer, resume.fullName)
  }

  const buffer = await renderPdf(templateId, data)
  return pdfResponse(buffer, data.fullName)
}
