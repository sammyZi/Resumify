/**
 * route.ts — GET /auth/oauth/google
 *
 * Initiates the Google OAuth PKCE flow by redirecting the user to Google's
 * authorization endpoint. The redirect is synchronous and must complete
 * within 3 seconds (it is effectively immediate — Supabase returns the URL
 * without any network call).
 *
 * On failure to obtain the redirect URL, redirects to /auth/login?error=oauth_failed.
 *
 * Requirements: 2.1, 2.2
 */

import { redirect } from 'next/navigation'
import { startGoogleOAuth } from '@/lib/services/auth-service'

export async function GET() {
  const result = await startGoogleOAuth()

  if (!result.ok) {
    redirect('/auth/login?error=oauth_failed')
  }

  redirect(result.value.redirectUrl)
}
