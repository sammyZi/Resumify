/**
 * route.ts — POST /auth/resend-confirmation
 *
 * Accepts { email } and resends the confirmation email for accounts whose
 * original link has expired. Always returns the same 200 response to
 * prevent email enumeration.
 *
 * HTTP responses:
 *  200 — { success: true, message: 'Confirmation email sent if account exists' }
 *
 * Requirements: 3.5
 */

import { resendConfirmation } from '@/lib/services/auth-service'

export async function POST(request: Request) {
  let email = ''
  try {
    const body = await request.json()
    if (body && typeof body === 'object' && typeof body.email === 'string') {
      email = body.email
    }
  } catch {
    // Malformed body — proceed with empty email (resendConfirmation swallows errors).
  }

  await resendConfirmation(email)

  return Response.json({
    success: true,
    message: 'Confirmation email sent if account exists',
  })
}
