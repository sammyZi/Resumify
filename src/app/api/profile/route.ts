/**
 * route.ts — GET + PUT /api/profile
 *
 * GET  /api/profile  — load the authenticated user's User_Profile
 * PUT  /api/profile  — save / update the authenticated user's User_Profile
 *
 * Both routes enforce an authenticated session.  Unauthenticated requests
 * receive HTTP 401 { error: 'Unauthorized' } with no profile content.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.8, 11.9
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfile, saveProfile } from '@/lib/stores/profile-store'

// ─── GET /api/profile ─────────────────────────────────────────────────────────

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await getProfile(user.id)

  if (!result.ok) {
    if (result.error.kind === 'not_found') {
      // First-time user — no profile exists yet.
      return Response.json({ profile: null })
    }
    // Unexpected DB error.
    return Response.json(
      { success: false, message: 'Failed to load profile', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ profile: result.value })
}

// ─── PUT /api/profile ─────────────────────────────────────────────────────────

export async function PUT(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: 'Invalid JSON body' }, { status: 400 })
  }

  const result = await saveProfile(user.id, body as Parameters<typeof saveProfile>[1])

  if (!result.ok) {
    if (result.error.kind === 'validation') {
      return Response.json(
        { success: false, errors: result.error.details.fields },
        { status: 422 }
      )
    }
    // db_error (or any other unexpected kind)
    return Response.json(
      { success: false, message: 'Failed to save profile', retry: true },
      { status: 500 }
    )
  }

  return Response.json({ success: true, profile: result.value })
}
