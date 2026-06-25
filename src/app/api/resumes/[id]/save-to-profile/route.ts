/**
 * route.ts — POST /api/resumes/:id/save-to-profile
 *
 * Copies the current resume's Resume_Data to the authenticated user's stored
 * User_Profile.  This is the only sanctioned path for propagating resume edits
 * back to the profile (Req 11.7).
 *
 * Enforces an authenticated session.  Unauthenticated requests receive
 * HTTP 401 { error: 'Unauthorized' }.
 *
 * Requirements: 11.7, 10.1
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { saveResumeDataToProfile } from '@/lib/stores/resume-store'

// ─── POST /api/resumes/:id/save-to-profile ────────────────────────────────────

export async function POST(
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

  const result = await saveResumeDataToProfile(user.id, id)

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
      { success: false, message: 'Failed to save resume data to profile', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ success: true, profile: result.value })
}
