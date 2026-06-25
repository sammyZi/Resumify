/**
 * route.ts — POST /api/resumes/:id/refine
 *
 * Returns an AI-generated refinement suggestion for the specified resume scope.
 * This route is suggestion-only — it does NOT persist any changes.
 *
 * Scope variants:
 *  - { kind: 'all' }                                        — entire resume body
 *  - { kind: 'section', section: 'experience'|'education'|'skills' }
 *  - { kind: 'entry', section: 'experience'|'education', index: number }
 *
 * On success: HTTP 200 { suggestion: RefinementSuggestion }
 * On empty scope: HTTP 400 { error: 'empty_scope', message }
 * On refiner failure: HTTP 500 { error: 'refinement_failed', message }
 *
 * Requires an authenticated session. Unauthenticated requests receive 401.
 * Ownership is enforced via Supabase RLS on getResume.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.8, 12.9, 12.10
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { getTemplateMeta, isKnownTemplate } from '@/lib/templates/registry'
import { refine } from '@/lib/services/ai-refiner'

// ─── POST /api/resumes/:id/refine ─────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // ── 1. Auth check ──────────────────────────────────────────────────────────
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
      { error: 'refinement_failed', message: 'Failed to load resume' },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Parse request body ──────────────────────────────────────────────────
  const body = await request.json()
  const scope = body?.scope

  // ── 4. Resolve role category from template (if any) ───────────────────────
  // Requirement 12.3: use template roleCategory as context when available.
  let roleCategory: string | undefined

  if (isKnownTemplate(resume.templateId)) {
    roleCategory = getTemplateMeta(resume.templateId).roleCategory
  }

  // ── 5. Build resumeData payload ────────────────────────────────────────────
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

  // ── 6. Call refiner ────────────────────────────────────────────────────────
  // Requirements 12.2, 12.4, 12.8, 12.10
  const refineResult = await refine({ resumeData, scope, roleCategory })

  if (!refineResult.ok) {
    const error = refineResult.error

    // Requirement 12.9: empty scope → 400, no OpenAI call was made
    if (error.code === 'refinement_empty_scope') {
      return Response.json(
        {
          error: 'empty_scope',
          message: 'There is no content to refine for the selected scope.',
        },
        { status: 400 }
      )
    }

    // Any other error (timeout, parse failure, OpenAI error) → 500
    // Requirement 12.1: failure does not affect saved Resume_Data
    return Response.json(
      { error: 'refinement_failed', message: error.message },
      { status: 500 }
    )
  }

  // ── 7. Return suggestion (do NOT persist) ─────────────────────────────────
  // Requirement 12.1: refinement is suggestion-only; persistence is a separate
  // user action and must never be a prerequisite for saving/generating/compiling.
  return Response.json({ suggestion: refineResult.value }, { status: 200 })
}
