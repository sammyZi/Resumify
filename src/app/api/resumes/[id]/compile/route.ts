/**
 * route.ts — POST /api/resumes/:id/compile
 *
 * Compiles the stored LaTeX source for a resume into a PDF, uploads the PDF
 * to private Storage, and records the storage path on the resume row.
 *
 * Flow:
 *  1. Auth check — 401 if not authenticated.
 *  2. Load resume via getResume (RLS-enforced ownership) — 404 if not found.
 *  3. Verify latexSource is non-null — 400 if missing.
 *  4. Call LaTeX compiler.
 *     - compile_error → 422
 *     - timeout       → 504
 *  5. Upload PDF to Storage via putPdf.
 *     - failure → 500 { retry: true }
 *  6. Record pdfPath on resume via attachPdf.
 *     - failure → 500 { retry: true }
 *  7. Success → 200 { success: true, pdfPath }.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import 'server-only'

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume, attachPdf } from '@/lib/stores/resume-store'
import { compile } from '@/lib/services/latex-compiler'
import { putPdf } from '@/lib/services/file-store'

// ─── POST /api/resumes/:id/compile ───────────────────────────────────────────

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
      { error: 'storage_failed', message: 'Failed to load resume', retry: true },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Check latexSource ───────────────────────────────────────────────────
  if (!resume.latexSource) {
    return Response.json(
      {
        error: 'no_latex_source',
        message: 'No LaTeX source available. Generate first.',
      },
      { status: 400 }
    )
  }

  // ── 4. Compile LaTeX → PDF ─────────────────────────────────────────────────
  const compileResult = await compile(resume.latexSource)

  if (!compileResult.ok) {
    if (compileResult.error.kind === 'timeout') {
      return Response.json(
        { error: 'timeout', message: 'Compilation exceeded 30 seconds' },
        { status: 504 }
      )
    }
    return Response.json(
      { error: 'compile_error', detail: compileResult.error.detail },
      { status: 422 }
    )
  }

  const { pdf } = compileResult.value

  // ── 5. Upload PDF to Storage ───────────────────────────────────────────────
  const pdfPath = `resumes/${user.id}/${id}.pdf`
  const putResult = await putPdf(pdfPath, pdf)

  if (!putResult.ok) {
    return Response.json(
      {
        error: 'storage_failed',
        message: putResult.error.message,
        retry: true,
      },
      { status: 500 }
    )
  }

  // ── 6. Record pdfPath on the resume row ────────────────────────────────────
  const attachResult = await attachPdf(id, pdfPath)

  if (!attachResult.ok) {
    return Response.json(
      {
        error: 'save_failed',
        message: 'PDF uploaded but failed to save path to resume',
        retry: true,
      },
      { status: 500 }
    )
  }

  // ── 7. Success ─────────────────────────────────────────────────────────────
  return Response.json({ success: true, pdfPath }, { status: 200 })
}
