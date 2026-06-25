/**
 * route.ts — GET /api/templates
 *
 * GET /api/templates               — list all templates
 * GET /api/templates?roleCategory= — list templates filtered by role category
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
import { listTemplates } from '@/lib/services/template-service'

// ─── GET /api/templates ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read optional ?roleCategory= query param.
  const roleCategory = request.nextUrl.searchParams.get('roleCategory') ?? undefined

  const templates = await listTemplates(roleCategory)

  return Response.json({ templates })
}
