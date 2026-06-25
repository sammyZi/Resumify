/**
 * route.ts — POST /auth/sign-up
 *
 * Accepts { email, password } and creates a new user account.
 *
 * HTTP responses:
 *  422 — validation error: { success: false, errors: { email?, password? } }
 *  409 — duplicate email: { success: false, message: 'Email already registered' }
 *  200 — success:         { success: true, message: 'Check your email...' }
 *
 * Requirements: 1.1, 1.4, 1.6, 3.7
 */

import { signUp } from '@/lib/services/auth-service'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { success: false, errors: { email: 'Invalid request body' } },
      { status: 422 }
    )
  }

  const { email, password } = (body ?? {}) as Record<string, unknown>

  const result = await signUp(email, password)

  if (!result.ok) {
    const { kind, message, fields } = result.error

    if (kind === 'validation') {
      return Response.json({ success: false, errors: fields ?? {} }, { status: 422 })
    }

    if (kind === 'duplicate_email') {
      return Response.json({ success: false, message }, { status: 409 })
    }

    // Unexpected error — do not leak internal detail.
    return Response.json(
      { success: false, message: 'Sign-up failed. Please try again.' },
      { status: 500 }
    )
  }

  return Response.json({ success: true, message: result.value.message })
}
