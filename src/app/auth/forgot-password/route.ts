/**
 * route.ts — POST /auth/forgot-password
 *
 * Accepts { email } and triggers a password-reset email if the address is
 * registered. Always returns the same 200 response to prevent email
 * enumeration.
 *
 * HTTP responses:
 *  200 — { success: true, message: 'If that email is registered, you will receive a reset link' }
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { requestPasswordReset } from '@/lib/services/auth-service'

export async function POST(request: Request) {
  let email = ''
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && typeof body.email === 'string') {
      email = body.email
    }
  } catch {
    // Malformed body — proceed with empty email (requestPasswordReset swallows errors).
  }

  // Always fires-and-forgets; errors are swallowed inside the service.
  await requestPasswordReset(email)

  return Response.json({
    success: true,
    message: 'If that email is registered, you will receive a reset link',
  })
}
