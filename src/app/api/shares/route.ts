/**
 * route.ts — POST /api/shares
 *
 * Creates a new recruiter or template share for the authenticated user's resume.
 *
 * Request body: { resumeId: string, kind: 'recruiter' | 'template' }
 * Response 201: { share: { id, token, kind, resumeId } }
 *
 * Requirements: 8.1, 8.2
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createShare, listSharesByResume } from '@/lib/services/share-service'

const VALID_KINDS = ['recruiter', 'template'] as const
type ShareKind = (typeof VALID_KINDS)[number]

// ─── GET /api/shares?resumeId=... ─────────────────────────────────────────────

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resumeId = new URL(request.url).searchParams.get('resumeId')
  if (!resumeId) {
    return Response.json({ error: 'resumeId is required' }, { status: 400 })
  }

  const result = await listSharesByResume(user.id, resumeId)
  if (!result.ok) {
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json({ shares: result.value })
}

export async function POST(request: Request) {
  // 1. Require authenticated session.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Parse and validate the request body.
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { resumeId, kind } = body as Record<string, unknown>

  if (!resumeId || typeof resumeId !== 'string') {
    return Response.json({ error: 'resumeId is required' }, { status: 400 })
  }

  if (!kind || !VALID_KINDS.includes(kind as ShareKind)) {
    return Response.json(
      { error: 'kind must be one of: recruiter, template' },
      { status: 400 }
    )
  }

  // 3. Create the share.
  const result = await createShare(user.id, resumeId, kind as ShareKind)

  if (!result.ok) {
    return Response.json(
      { error: result.error.message },
      { status: 500 }
    )
  }

  const { id, token, kind: shareKind, resumeId: shareResumeId } = result.value

  return Response.json(
    { share: { id, token, kind: shareKind, resumeId: shareResumeId } },
    { status: 201 }
  )
}
