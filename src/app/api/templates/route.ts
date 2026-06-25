/**
 * route.ts — GET /api/templates
 *
 * Returns the predefined, code-based templates (see lib/templates/registry).
 * Optional ?roleCategory= filters by exact category match.
 *
 * Requires an authenticated session. Unauthenticated requests receive
 * HTTP 401 { error: 'Unauthorized' }.
 *
 * An empty template list is a valid success response (not 404).
 *
 * Requirements: 4.6, 4.7, 10.1
 */

import type { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { TEMPLATES } from '@/lib/templates/registry'

// ─── GET /api/templates ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const roleCategory = request.nextUrl.searchParams.get('roleCategory') ?? undefined

  const templates =
    roleCategory !== undefined
      ? TEMPLATES.filter((t) => t.roleCategory === roleCategory)
      : TEMPLATES

  return Response.json({ templates })
}
