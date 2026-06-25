/**
 * route.ts — GET + POST /auth/reset-password
 *
 * GET  — placeholder indicating the reset-password page exists.
 *        The actual UI page (task 13) will replace this.
 *
 * POST — Accepts { newPassword, confirmPassword } and resets the user's
 *         password. The PKCE code exchange must happen before this call (the
 *         callback route or the UI page calls exchangeCodeForSession first so
 *         the session is established).
 *
 * HTTP responses (POST):
 *  422 — validation/mismatch: { success: false, errors: { ... } }
 *  400 — token invalid/expired: { success: false, kind: 'token_invalid', message: '...' }
 *  200 — success: { success: true, message: 'Password updated successfully' }
 *
 * Requirements: 1.8, 3.4, 3.5, 3.6
 */

import { resetPassword } from '@/lib/services/auth-service'

// ─── GET /auth/reset-password ─────────────────────────────────────────────────

export async function GET() {
  // The real page UI will be built in task 13.
  // This stub confirms the route exists and returns a minimal response.
  return Response.json({
    message: 'Reset password page. Use POST with { newPassword, confirmPassword } to update.',
  })
}

// ─── POST /auth/reset-password ────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { success: false, errors: { newPassword: 'Invalid request body' } },
      { status: 422 }
    )
  }

  const { newPassword, confirmPassword } = (body ?? {}) as Record<string, unknown>

  const result = await resetPassword(newPassword, confirmPassword)

  if (!result.ok) {
    const { kind, message, fields } = result.error

    if (kind === 'validation' || kind === 'password_mismatch') {
      return Response.json({ success: false, errors: fields ?? { newPassword: message } }, { status: 422 })
    }

    if (kind === 'token_invalid' || kind === 'token_expired') {
      return Response.json({ success: false, kind: 'token_invalid', message }, { status: 400 })
    }

    return Response.json(
      { success: false, kind: 'token_invalid', message: 'Reset link is invalid or has expired' },
      { status: 400 }
    )
  }

  return Response.json({ success: true, message: 'Password updated successfully' })
}
