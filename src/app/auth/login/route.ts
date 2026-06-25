/**
 * route.ts — POST /auth/login
 *
 * Accepts { email, password } and establishes an authenticated session.
 *
 * HTTP responses:
 *  403 — unconfirmed account: { success: false, message: 'Please confirm...' }
 *  423 — locked account:      { success: false, message: 'Account temporarily locked...' }
 *  401 — bad credentials:     { success: false, message: 'Invalid credentials' }
 *  200 — success:             { success: true }
 *
 * The error message intentionally NEVER reveals whether the email or password
 * was wrong (non-disclosure, Req 1.5).
 *
 * Requirements: 1.2, 1.3, 1.5, 1.7
 */

import { login } from '@/lib/services/auth-service'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
  }

  const { email, password } = (body ?? {}) as Record<string, unknown>

  const result = await login(email, password)

  if (!result.ok) {
    const { kind, message } = result.error

    if (kind === 'unconfirmed') {
      return Response.json({ success: false, message }, { status: 403 })
    }

    if (kind === 'locked') {
      return Response.json(
        { success: false, message: 'Account temporarily locked. Try again in 15 minutes.' },
        { status: 423 }
      )
    }

    // invalid_credentials or unknown — return generic 401 (no field hint).
    return Response.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
  }

  return Response.json({ success: true })
}
