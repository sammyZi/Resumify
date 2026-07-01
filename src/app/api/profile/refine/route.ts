/**
 * route.ts — POST /api/profile/refine
 *
 * Returns an AI-generated refinement suggestion. Suggestion-only — does NOT
 * persist anything.
 *
 * Body: {
 *   scope: RefineScope,
 *   data?: ResumeData   // current unsaved form data; used when no saved profile exists yet
 * }
 *
 * Priority for the data to refine:
 *  1. `body.data`  — current form data sent by the client (works before first save)
 *  2. saved profile in the database (fallback when body.data is absent)
 *
 * On success: HTTP 200 { suggestion: RefinementSuggestion }
 * On empty scope: HTTP 400 { error: 'empty_scope', message }
 * On refiner failure: HTTP 500 { error: 'refinement_failed', message }
 *
 * Requires an authenticated session.
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/stores/profile-store'
import { refine } from '@/lib/services/ai-refiner'
import type { ResumeData } from '@/lib/types'

export async function POST(request: NextRequest) {
  const isDemo = request.headers.get('x-demo-mode') === '1'
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Demo mode is stateless: it always supplies `data` in the body, so no session
  // is required. Non-demo requests still require authentication.
  if (!user && !isDemo) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const scope = body?.scope
  const clientData = body?.data as ResumeData | undefined

  let resumeData: ResumeData | null = null

  // 1. Prefer data sent from the client (works before first save, and in demo).
  if (clientData && typeof clientData === 'object') {
    resumeData = {
      fullName:       clientData.fullName       ?? '',
      email:          clientData.email          ?? '',
      phone:          clientData.phone          ?? '',
      location:       clientData.location       ?? '',
      summary:        clientData.summary        ?? '',
      links:          clientData.links          ?? [],
      experience:     clientData.experience     ?? [],
      projects:       clientData.projects       ?? [],
      education:      clientData.education      ?? [],
      certifications: clientData.certifications ?? [],
      skills:         clientData.skills         ?? [],
      achievements:   clientData.achievements   ?? [],
    }
  } else if (user) {
    // 2. Fall back to the saved profile.
    const profileResult = await getProfile(user.id)
    if (!profileResult.ok) {
      return Response.json(
        { error: 'refinement_failed', message: 'No profile data found. Fill in the form and try again.' },
        { status: 400 }
      )
    }
    const p = profileResult.value
    resumeData = {
      fullName:       p.fullName,
      email:          p.email,
      phone:          p.phone,
      location:       p.location,
      summary:        p.summary,
      links:          p.links,
      experience:     p.experience,
      projects:       p.projects,
      education:      p.education,
      certifications: p.certifications,
      skills:         p.skills,
      achievements:   p.achievements,
    }
  }

  if (!resumeData) {
    return Response.json(
      { error: 'refinement_failed', message: 'No profile data found. Fill in the form and try again.' },
      { status: 400 }
    )
  }

  const result = await refine({ resumeData, scope })

  if (!result.ok) {
    const error = result.error
    if (error.code === 'refinement_empty_scope') {
      return Response.json(
        { error: 'empty_scope', message: 'There is no content to refine for the selected scope.' },
        { status: 400 }
      )
    }
    return Response.json(
      { error: 'refinement_failed', message: error.message },
      { status: 500 }
    )
  }

  return Response.json({ suggestion: result.value }, { status: 200 })
}
