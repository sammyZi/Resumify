/**
 * route.ts — GET /auth/callback
 *
 * Handles the OAuth / email-confirmation callback from Supabase.
 *
 * Query parameters:
 *  code  — PKCE authorization code to exchange for a session
 *  error — set to 'access_denied' when the user cancelled OAuth
 *
 * Outcomes:
 *  - User cancelled (error=access_denied)  → /auth/login?error=cancelled
 *  - Missing code                          → /auth/login?error=oauth_failed
 *  - Code exchange fails                   → /auth/login?error=oauth_failed
 *  - Success (new or existing account)     → / (workspace)
 *
 * For new Google users Supabase automatically provisions a confirmed account.
 * For existing Google users Supabase authenticates them directly.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import type { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'
import { completeOAuth } from '@/lib/services/auth-service'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl

  const error = searchParams.get('error')
  const code = searchParams.get('code')

  // ── User cancelled the OAuth consent screen ────────────────────────────────
  if (error === 'access_denied') {
    redirect('/auth/login?error=cancelled')
  }

  // ── No code present — something went wrong upstream ───────────────────────
  if (!code) {
    redirect('/auth/login?error=oauth_failed')
  }

  // ── Exchange the code for a session ───────────────────────────────────────
  const result = await completeOAuth(code)

  if (!result.ok) {
    redirect('/auth/login?error=oauth_failed')
  }

  // ── Success — send user to the workspace ──────────────────────────────────
  redirect('/')
}
