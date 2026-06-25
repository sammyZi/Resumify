/**
 * auth-service.ts — Auth_Service: wraps Supabase Auth for all authentication flows.
 *
 * SERVER-ONLY module. Never import this from client components or browser code.
 *
 * Covers:
 *  - Sign-up with email/password validation and duplicate detection (Req 1.1, 1.4, 1.6, 3.7)
 *  - Login with session establishment, unconfirmed-account guard, lockout (Req 1.2, 1.3, 1.5, 1.7)
 *  - Pure token validity functions (Req 1.8, 3.1, 3.4, 3.6)
 *  - Password reset / forgot-password flow (Req 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
 *  - Confirmation resend (Req 3.5)
 *  - Google OAuth flow (Req 2.1, 2.2, 2.3, 2.4, 2.5)
 *
 * NOTE on in-memory lockout store: the Map below resets whenever the Node.js
 * process restarts (e.g. server reboot, deploy). For production use a shared
 * store such as Redis. This is acceptable for the current implementation scope.
 */

import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ok, err, type Result } from '@/lib/result'

// ─── AuthError ───────────────────────────────────────────────────────────────

export type AuthError = {
  kind:
    | 'validation'
    | 'duplicate_email'
    | 'invalid_credentials'
    | 'unconfirmed'
    | 'locked'
    | 'token_invalid'
    | 'token_expired'
    | 'password_mismatch'
    | 'oauth_cancelled'
    | 'oauth_failed'
    | 'unknown'
  message: string
  /** Present on validation errors — maps field name to error message. */
  fields?: Record<string, string>
  /** Unix ms timestamp when the lockout expires (kind === 'locked'). */
  lockoutExpiresAt?: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMAIL_MAX_LENGTH = 254
const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

/** Simple RFC-5322–inspired email regex: checks for local@domain.tld shape. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const LOCKOUT_MAX_FAILURES = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

const SESSION_INACTIVITY_SECONDS = 30 * 60 // 30 minutes

const CONFIRMATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000 // 60 minutes

// ─── In-memory lockout store ─────────────────────────────────────────────────

type LockoutEntry = {
  count: number
  windowStart: number
  lockedUntil?: number
}

// Keyed by lower-cased email address.
const lockoutStore = new Map<string, LockoutEntry>()

// ─── Validation helpers ───────────────────────────────────────────────────────

function validateEmail(email: unknown): string | null {
  if (typeof email !== 'string' || email.length === 0) {
    return 'Email is required'
  }
  if (email.length > EMAIL_MAX_LENGTH) {
    return `Email must be ${EMAIL_MAX_LENGTH} characters or fewer`
  }
  if (!EMAIL_REGEX.test(email)) {
    return 'Email must be a valid email address'
  }
  return null
}

function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required'
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must be ${PASSWORD_MAX_LENGTH} characters or fewer`
  }
  return null
}

// ─── signUp ──────────────────────────────────────────────────────────────────

/**
 * Creates a new user account after validating credentials.
 *
 * On invalid input returns field-specific errors without touching Supabase.
 * On success Supabase triggers the confirmation email (custom template via
 * the Supabase dashboard / Auth config).
 *
 * Requirements: 1.1, 1.4, 1.6, 3.7
 */
export async function signUp(
  email: unknown,
  password: unknown
): Promise<Result<{ message: string }, AuthError>> {
  // ── Validate inputs ────────────────────────────────────────────────────────
  const emailError = validateEmail(email)
  const passwordError = validatePassword(password)

  if (emailError || passwordError) {
    const fields: Record<string, string> = {}
    if (emailError) fields.email = emailError
    if (passwordError) fields.password = passwordError
    return err({
      kind: 'validation',
      message: 'Validation failed',
      fields,
    })
  }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signUp({
    email: email as string,
    password: password as string,
  })

  if (error) {
    // Supabase may return "User already registered" or similar for duplicates.
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('user already')) {
      return err({ kind: 'duplicate_email', message: 'Email already registered' })
    }
    return err({ kind: 'unknown', message: error.message })
  }

  // Supabase returns a user with an empty identities array when the email is
  // already registered and email confirmation is required (soft duplicate).
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return err({ kind: 'duplicate_email', message: 'Email already registered' })
  }

  return ok({ message: 'Check your email to confirm your account' })
}

// ─── login ────────────────────────────────────────────────────────────────────

/**
 * Authenticates the user and establishes a 30-minute-inactivity session.
 *
 * - Lockout: 5 failures within a 15-minute window locks the account for 15 min.
 * - Unconfirmed accounts are rejected before the generic credential error.
 * - The generic "invalid credentials" error deliberately does not reveal
 *   whether the email or the password was wrong (non-disclosure, Req 1.5).
 *
 * Requirements: 1.2, 1.3, 1.5, 1.7
 */
export async function login(
  email: unknown,
  password: unknown
): Promise<Result<{ sessionExpiry: number }, AuthError>> {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return err({ kind: 'invalid_credentials', message: 'Invalid credentials' })
  }

  const key = email.toLowerCase()
  const now = Date.now()

  // ── Check lockout ─────────────────────────────────────────────────────────
  const entry = lockoutStore.get(key)
  if (entry?.lockedUntil !== undefined && now < entry.lockedUntil) {
    return err({
      kind: 'locked',
      message: 'Account temporarily locked. Try again in 15 minutes.',
      lockoutExpiresAt: entry.lockedUntil,
    })
  }

  const supabase = await createSupabaseServerClient()

  // Supabase signInWithPassword sets the session cookie via @supabase/ssr.
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const msg = error.message?.toLowerCase() ?? ''

    // ── Unconfirmed email ──────────────────────────────────────────────────
    if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
      return err({ kind: 'unconfirmed', message: 'Please confirm your account by email' })
    }

    // ── Increment failure counter ──────────────────────────────────────────
    const existing = lockoutStore.get(key)
    let newCount: number
    let windowStart: number

    if (!existing || now - existing.windowStart > LOCKOUT_WINDOW_MS) {
      // Fresh window
      newCount = 1
      windowStart = now
    } else {
      newCount = existing.count + 1
      windowStart = existing.windowStart
    }

    if (newCount >= LOCKOUT_MAX_FAILURES) {
      const lockedUntil = now + LOCKOUT_DURATION_MS
      lockoutStore.set(key, { count: newCount, windowStart, lockedUntil })
      return err({
        kind: 'locked',
        message: 'Account temporarily locked. Try again in 15 minutes.',
        lockoutExpiresAt: lockedUntil,
      })
    }

    lockoutStore.set(key, { count: newCount, windowStart })
    return err({ kind: 'invalid_credentials', message: 'Invalid credentials' })
  }

  // ── Success — reset failure counter ───────────────────────────────────────
  lockoutStore.delete(key)

  const sessionExpiry = now + SESSION_INACTIVITY_SECONDS * 1000
  return ok({ sessionExpiry })
}

// ─── Pure token validity functions ───────────────────────────────────────────

/**
 * Returns true iff the confirmation token was used within 24 hours of issuance.
 *
 * Requirements: 1.8, 3.1
 */
export function isConfirmationTokenValid(issuedAt: Date, usedAt: Date): boolean {
  return usedAt.getTime() - issuedAt.getTime() <= CONFIRMATION_TOKEN_TTL_MS
}

/**
 * Returns true iff the reset token was used within 60 minutes of issuance
 * AND has not previously been used (single-use after successful reset).
 *
 * Requirements: 3.4, 3.6
 */
export function isResetTokenValid(
  issuedAt: Date,
  usedAt: Date,
  alreadyUsed: boolean
): boolean {
  if (alreadyUsed) return false
  return usedAt.getTime() - issuedAt.getTime() <= RESET_TOKEN_TTL_MS
}

// ─── requestPasswordReset ─────────────────────────────────────────────────────

/**
 * Initiates the forgot-password flow.
 *
 * Always resolves (void) regardless of whether the email is registered —
 * callers must return a uniform response to prevent email enumeration.
 * For registered addresses Supabase sends the custom forgot-password template
 * with a 60-minute reset link pointing to /auth/reset-password.
 *
 * Requirements: 3.1, 3.2, 3.3
 */
export async function requestPasswordReset(email: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/reset-password`,
    })
  } catch {
    // Swallow all errors — uniform outward response required.
  }
}

// ─── resetPassword ────────────────────────────────────────────────────────────

/**
 * Completes the password reset after the user has exchanged the reset code
 * for a session (handled in the /auth/reset-password route).
 *
 * Validates that newPassword meets length requirements and matches
 * confirmPassword, then updates via Supabase updateUser.
 * Supabase invalidates the reset token after a successful updateUser call.
 *
 * Requirements: 3.4, 3.5, 3.6
 */
export async function resetPassword(
  newPassword: unknown,
  confirmPassword: unknown
): Promise<Result<void, AuthError>> {
  const passwordError = validatePassword(newPassword)
  if (passwordError) {
    return err({
      kind: 'validation',
      message: 'Validation failed',
      fields: { newPassword: passwordError },
    })
  }

  if (newPassword !== confirmPassword) {
    return err({
      kind: 'password_mismatch',
      message: 'Passwords do not match',
      fields: { confirmPassword: 'Passwords do not match' },
    })
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword as string })

  if (error) {
    const msg = error.message?.toLowerCase() ?? ''
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
      return err({ kind: 'token_invalid', message: 'Reset link is invalid or has expired' })
    }
    return err({ kind: 'unknown', message: error.message })
  }

  return ok(undefined)
}

// ─── resendConfirmation ───────────────────────────────────────────────────────

/**
 * Resends the confirmation email for accounts with an expired/unclicked link.
 *
 * Always resolves (void) — uniform outward response to prevent enumeration.
 *
 * Requirements: 3.5
 */
export async function resendConfirmation(email: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.resend({ type: 'signup', email })
  } catch {
    // Swallow all errors — uniform outward response required.
  }
}

// ─── startGoogleOAuth ─────────────────────────────────────────────────────────

/**
 * Initiates the Google OAuth PKCE flow.
 *
 * Returns the provider redirect URL. The caller should redirect the user
 * there within 3 seconds (it is a synchronous URL computation by Supabase).
 *
 * Requirements: 2.1, 2.2
 */
export async function startGoogleOAuth(): Promise<Result<{ redirectUrl: string }, AuthError>> {
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      skipBrowserRedirect: true, // We handle the redirect ourselves in the route handler.
    },
  })

  if (error || !data?.url) {
    return err({ kind: 'oauth_failed', message: 'Failed to start Google sign-in' })
  }

  return ok({ redirectUrl: data.url })
}

// ─── completeOAuth ────────────────────────────────────────────────────────────

/**
 * Completes the OAuth PKCE flow by exchanging the authorization code for a
 * session. Supabase automatically provisions a new confirmed account for new
 * users or authenticates an existing one.
 *
 * Requirements: 2.3, 2.4, 2.5
 */
export async function completeOAuth(code: string): Promise<Result<void, AuthError>> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return err({ kind: 'oauth_failed', message: error.message })
  }

  return ok(undefined)
}
