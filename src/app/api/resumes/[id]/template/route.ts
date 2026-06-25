/**
 * route.ts — PUT /api/resumes/:id/template
 *
 * Applies a template to the specified resume.
 *
 * Body: { templateId: string }
 *
 * Requires an authenticated session. Unauthenticated requests receive
 * HTTP 401 { error: 'Unauthorized' }.
 *
 * On success:  { success: true }               — HTTP 200 (Req 4.3)
 * On failure:  { success: false, message, retry: true } — HTTP 500 (Req 4.4)
 *
 * Requirements: 4.3, 4.4, 10.1
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { applyTemplate } from '@/lib/services/template-service'

// ─── PUT /api/resumes/:id/template ────────────────────────────────────────────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { success: false, message: 'templateId is required' },
      { status: 400 }
    )
  }

  // Validate that templateId is present and is a string.
  if (
    !body ||
    typeof body !== 'object' ||
    !('templateId' in body) ||
    typeof (body as Record<string, unknown>).templateId !== 'string'
  ) {
    return Response.json(
      { success: false, message: 'templateId is required' },
      { status: 400 }
    )
  }

  const { templateId } = body as { templateId: string }

  const result = await applyTemplate(id, templateId)

  if (!result.ok) {
    return Response.json(
      { success: false, message: 'Failed to apply template', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ success: true })
}
