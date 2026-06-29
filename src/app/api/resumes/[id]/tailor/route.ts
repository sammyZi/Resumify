/**
 * route.ts — POST /api/resumes/:id/tailor
 *
 * Generates a tailored version of the resume's skills, experience descriptions,
 * and summary aligned to a pasted job description. Returns the tailored fields
 * WITHOUT persisting — the user must accept and save.
 *
 * Body: { jobDescription: string }
 *
 * On success: HTTP 200 { result: TailoredResume }
 * On empty/short JD: HTTP 400 { error: 'empty', message }
 * On failure: HTTP 500 { error: 'tailor_failed', message }
 *
 * Requires an authenticated session.
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { tailorResume } from '@/lib/services/job-matcher'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // ── 2. Load resume ─────────────────────────────────────────────────────────
  const resumeResult = await getResume(id)

  if (!resumeResult.ok) {
    if (resumeResult.error.kind === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(
      { error: 'tailor_failed', message: 'Failed to load resume' },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({}))
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : ''

  // ── 4. Tailor ──────────────────────────────────────────────────────────────
  const resumeData = {
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

  const tailorResult = await tailorResume({ resumeData, jobDescription })

  if (!tailorResult.ok) {
    const error = tailorResult.error
    if (error.code === 'tailor_empty') {
      return Response.json({ error: 'empty', message: error.message }, { status: 400 })
    }
    return Response.json(
      { error: 'tailor_failed', message: error.message },
      { status: 500 }
    )
  }

  return Response.json({ result: tailorResult.value }, { status: 200 })
}
