/**
 * route.ts — POST /api/resumes/:id/match
 *
 * Scores the resume against a pasted job description and returns a match report.
 * This route is read-only — it never persists anything.
 *
 * Body: { jobDescription: string }
 *
 * On success: HTTP 200 { result: JobMatchResult }
 * On empty/short JD: HTTP 400 { error: 'empty', message }
 * On failure: HTTP 500 { error: 'job_match_failed', message }
 *
 * Requires an authenticated session. Unauthenticated requests receive 401.
 * Ownership is enforced via Supabase RLS on getResume.
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { matchJob } from '@/lib/services/job-matcher'

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

  // ── 2. Load resume (ownership enforced by RLS) ─────────────────────────────
  const resumeResult = await getResume(id)

  if (!resumeResult.ok) {
    if (resumeResult.error.kind === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(
      { error: 'job_match_failed', message: 'Failed to load resume' },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Parse body ──────────────────────────────────────────────────────────
  const body = await request.json().catch(() => ({}))
  const jobDescription = typeof body?.jobDescription === 'string' ? body.jobDescription : ''

  // ── 4. Run the matcher ─────────────────────────────────────────────────────
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

  const matchResult = await matchJob({ resumeData, jobDescription })

  if (!matchResult.ok) {
    const error = matchResult.error
    if (error.code === 'job_match_empty') {
      return Response.json({ error: 'empty', message: error.message }, { status: 400 })
    }
    return Response.json(
      { error: 'job_match_failed', message: error.message },
      { status: 500 }
    )
  }

  return Response.json({ result: matchResult.value }, { status: 200 })
}
