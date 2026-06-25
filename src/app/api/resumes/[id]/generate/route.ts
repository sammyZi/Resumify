/**
 * route.ts — POST /api/resumes/:id/generate
 *
 * Generates a LaTeX resume source for the specified resume using AI.
 *
 * Prerequisites (checked before generation):
 *  - Saved Resume_Data must be present on the resume (non-empty fullName signals this).
 *  - A template must be associated with the resume (templateId must be non-null).
 *
 * If prerequisites are missing, returns HTTP 400 with a list of missing items.
 *
 * On generation success, persists the LaTeX via Resume_Store.saveLatexSource.
 *  - If persist fails: HTTP 500 { error: 'save_failed', latex } — retains latex
 *    in response so the client can retry the save without re-generating.
 *
 * On generator error/timeout: HTTP 500 { error: 'generation_failed', message }
 *  — data and template are left unchanged.
 *
 * Requires an authenticated session. Unauthenticated requests receive 401.
 * Ownership is enforced via Supabase RLS on getResume / saveLatexSource.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.5, 6.6
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume, saveLatexSource } from '@/lib/stores/resume-store'
import { generateLatex } from '@/lib/services/ai-generator'
import { listTemplates } from '@/lib/services/template-service'

// ─── POST /api/resumes/:id/generate ──────────────────────────────────────────

export async function POST(
  _request: NextRequest,
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
      { error: 'generation_failed', message: 'Failed to load resume' },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Prerequisites check ─────────────────────────────────────────────────
  // Requirement 6.2: reject if no Resume_Data saved or no template associated.
  const missing: string[] = []

  // A resume has saved data when the required fullName field is non-empty.
  const hasResumeData = resume.fullName.trim().length > 0
  if (!hasResumeData) {
    missing.push('Resume_Data')
  }

  const hasTemplate = resume.templateId !== null
  if (!hasTemplate) {
    missing.push('template')
  }

  if (missing.length > 0) {
    return Response.json(
      { error: 'missing_prerequisites', missing },
      { status: 400 }
    )
  }

  // ── 4. Resolve the associated template ────────────────────────────────────
  // templateId is guaranteed non-null at this point (checked above).
  const templates = await listTemplates()
  const template = templates.find((t) => t.id === resume.templateId)

  if (!template) {
    return Response.json(
      { error: 'missing_prerequisites', missing: ['template'] },
      { status: 400 }
    )
  }

  // ── 5. Build resume data payload ───────────────────────────────────────────
  const resumeData = {
    fullName: resume.fullName,
    email: resume.email,
    experience: resume.experience,
    education: resume.education,
    skills: resume.skills,
  }

  // ── 6. Generate LaTeX (up to 3 attempts, 60s each) ────────────────────────
  // Requirement 6.1, 6.3
  const generationResult = await generateLatex({ resumeData, template })

  if (!generationResult.ok) {
    return Response.json(
      {
        error: 'generation_failed',
        message: generationResult.error.message,
      },
      { status: 500 }
    )
  }

  const { latex } = generationResult.value

  // ── 7. Persist LaTeX source ────────────────────────────────────────────────
  // Requirement 6.5: on success, persist via Resume_Store.
  // Requirement 6.6: if persist fails, return save_failed but retain latex.
  const saveResult = await saveLatexSource(id, latex)

  if (!saveResult.ok) {
    return Response.json(
      { error: 'save_failed', latex },
      { status: 500 }
    )
  }

  // ── 8. Success ─────────────────────────────────────────────────────────────
  return Response.json({ latex }, { status: 200 })
}
