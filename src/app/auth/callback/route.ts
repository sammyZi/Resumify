/**
 * route.ts — GET /auth/callback
 *
 * Handles the OAuth / email-confirmation callback from Supabase.
 *
 * Query parameters:
 *  code        — PKCE authorization code to exchange for a session
 *  error       — set to 'access_denied' when the user cancelled OAuth, or when
 *                an email link is rejected
 *  error_code  — Supabase code such as 'otp_expired' for expired email links
 *
 * Outcomes:
 *  - Expired confirmation link             → /confirmation-expired (Req 1.8)
 *  - User cancelled (error=access_denied)  → /login?error=cancelled
 *  - Missing code                          → /login?error=oauth_failed
 *  - Code exchange fails                   → /login?error=oauth_failed
 *  - Success (new or existing account)     → / (workspace)
 *
 * For new Google users Supabase automatically provisions a confirmed account.
 * For existing Google users Supabase authenticates them directly.
 *
 * Requirements: 1.8, 2.3, 2.4, 2.5
 */

import type { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { completeOAuth } from '@/lib/services/auth-service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const error = searchParams.get('error')
  const errorCode = searchParams.get('error_code')
  const errorDescription = searchParams.get('error_description') ?? ''
  const code = searchParams.get('code')

  // ── Expired (or otherwise invalid) email confirmation link (Req 1.8) ───────
  if (errorCode === 'otp_expired' || /expired/i.test(errorDescription)) {
    redirect('/confirmation-expired')
  }

  // ── User cancelled the OAuth consent screen ────────────────────────────────
  if (error === 'access_denied') {
    redirect('/login?error=cancelled')
  }

  // ── No code present — something went wrong upstream ───────────────────────
  if (!code) {
    redirect('/login?error=oauth_failed')
  }

  // ── Exchange the code for a session ───────────────────────────────────────
  const result = await completeOAuth(code)

  if (!result.ok) {
    redirect('/login?error=oauth_failed')
  }

  // ── Success — send user to the workspace ──────────────────────────────────
  redirect('/')
}
