/**
 * route.ts — GET /api/resumes/:id/download
 *
 * Returns a short-lived signed URL for downloading the compiled PDF of a resume.
 *
 * Flow:
 *  1. Auth check — 401 if not authenticated.
 *  2. Load resume via getResume (RLS-enforced ownership) — 404 if not found.
 *  3. Check pdfPath is non-null — 404 if no PDF compiled yet.
 *  4. Generate a 5-minute signed URL via getSignedDownloadUrl.
 *     - failure → 500
 *  5. Success → 200 { url }.
 *
 * Requirements: 7.3
 */

import 'server-only'

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume } from '@/lib/stores/resume-store'
import { getSignedDownloadUrl } from '@/lib/services/file-store'

// ─── GET /api/resumes/:id/download ───────────────────────────────────────────

export async function GET(
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
      { error: 'url_generation_failed', message: 'Failed to load resume' },
      { status: 500 }
    )
  }

  const resume = resumeResult.value

  // ── 3. Check pdfPath ───────────────────────────────────────────────────────
  if (!resume.pdfPath) {
    return Response.json(
      {
        error: 'no_pdf',
        message: 'No PDF available. Compile first.',
      },
      { status: 404 }
    )
  }

  // ── 4. Generate signed URL (5-minute TTL) ─────────────────────────────────
  const urlResult = await getSignedDownloadUrl(resume.pdfPath, 300)

  if (!urlResult.ok) {
    return Response.json(
      {
        error: 'url_generation_failed',
        message: urlResult.error.message,
      },
      { status: 500 }
    )
  }

  // ── 5. Success ─────────────────────────────────────────────────────────────
  return Response.json({ url: urlResult.value }, { status: 200 })
}
