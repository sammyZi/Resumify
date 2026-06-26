/**
 * route.ts — GET + PUT /api/resumes/:id
 *
 * GET /api/resumes/:id — load a specific resume by id
 * PUT /api/resumes/:id — save (validate + persist) Resume_Data for a resume
 *
 * Both routes enforce an authenticated session.  Unauthenticated requests
 * receive HTTP 401 { error: 'Unauthorized' } with no resume content.
 *
 * Requirements: 5.4, 5.5, 5.6, 5.7, 11.7, 10.1
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getResume, saveResumeData, deleteResume, renameResume } from '@/lib/stores/resume-store'
import type { ResumeDataInput } from '@/lib/types'

// ─── GET /api/resumes/:id ─────────────────────────────────────────────────────

export async function GET(
  _request: NextRequest,
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

  const result = await getResume(id)

  if (!result.ok) {
    if (result.error.kind === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(
      { success: false, message: 'Failed to load resume', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ resume: result.value })
}

// ─── PUT /api/resumes/:id ─────────────────────────────────────────────────────

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
    return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await saveResumeData(id, body as ResumeDataInput)

  if (!result.ok) {
    if (result.error.kind === 'validation') {
      return Response.json(
        { success: false, errors: result.error.details.fields },
        { status: 422 }
      )
    }
    if (result.error.kind === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(
      { success: false, message: 'Failed to save resume', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ success: true, resume: result.value })
}

// ─── DELETE /api/resumes/:id ──────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
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

  const result = await deleteResume(id)

  if (!result.ok) {
    if (result.error.kind === 'not_found') {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return Response.json(
      { success: false, message: 'Failed to delete resume', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ success: true })
}

// ─── PATCH /api/resumes/:id ───────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const title = typeof body?.title === 'string' ? body.title : null

  if (!title || !title.trim()) {
    return Response.json({ success: false, message: 'Title is required' }, { status: 400 })
  }

  const result = await renameResume(id, title)
  if (!result.ok) {
    const status = result.error.kind === 'not_found' ? 404 : 500
    return Response.json({ success: false, message: result.error.kind }, { status })
  }

  return Response.json({ success: true, resume: result.value })
}
