/**
 * route.ts — POST /api/shares/:id/revoke
 *
 * Revokes a share owned by the authenticated user.
 *
 * Response 200: { success: true }
 * Response 404: { error: string } — not found or not owned by caller
 * Response 401: { error: 'Unauthorized' } — no session
 *
 * Requirements: 8.7
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revokeShare } from '@/lib/services/share-service'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Require authenticated session.
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Extract share ID from route params.
  const { id } = await params

  // 3. Revoke the share.
  const result = await revokeShare(user.id, id)

  if (!result.ok) {
    const { kind } = result.error
    if (kind === 'not_found') {
      return Response.json({ error: result.error.message }, { status: 404 })
    }
    return Response.json({ error: result.error.message }, { status: 500 })
  }

  return Response.json({ success: true }, { status: 200 })
}
