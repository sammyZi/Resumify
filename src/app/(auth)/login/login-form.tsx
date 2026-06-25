'use client'

/**
 * login-form.tsx — email/password login form.
 *
 * Wires to POST /auth/login and renders:
 *  - a generic auth error that does NOT reveal email vs password (Req 1.3)
 *  - an unconfirmed-account message with a resend-confirmation action (Req 1.5)
 *  - a temporarily-locked message (Req 1.7)
 *  - Google sign-in (links to GET /auth/oauth/google) (Req 2.1)
 *  - OAuth cancel/failure messages from the ?error= query param (Req 2.4, 2.5)
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

type LoginError =
  | { kind: 'invalid'; message: string }
  | { kind: 'unconfirmed'; message: string }
  | { kind: 'locked'; message: string }

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

  const oauthMessage =
    oauthError === 'cancelled'
      ? 'Sign-in was cancelled. You can try again below.'
      : oauthError === 'oauth_failed'
        ? 'Google sign-in failed. Please try again.'
        : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResend('idle')

    try {
      const res = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
      }

      if (res.ok && data.success) {
        router.push('/')
        router.refresh()
        return
      }

      if (res.status === 403) {
        setError({
          kind: 'unconfirmed',
          message: data.message ?? 'Please confirm your account by email.',
        })
      } else if (res.status === 423) {
        setError({
          kind: 'locked',
          message:
            data.message ?? 'Account temporarily locked. Try again in 15 minutes.',
        })
      } else {
        setError({ kind: 'invalid', message: data.message ?? 'Invalid credentials' })
      }
    } catch {
      setError({ kind: 'invalid', message: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setResend('sending')
    try {
      await fetch('/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
    } catch {
      // Uniform outward behavior — ignore errors.
    }
    setResend('sent')
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to continue building your resume.</p>
      </div>

      {oauthMessage && <Notice variant="info">{oauthMessage}</Notice>}

      {error && (
        <Notice variant={error.kind === 'invalid' ? 'error' : 'info'}>
          {error.message}
          {error.kind === 'unconfirmed' && (
            <div className={styles.noticeAction}>
              {resend === 'sent' ? (
                <span>Confirmation email sent if an account exists.</span>
              ) : (
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={handleResend}
                  disabled={resend === 'sending'}
                >
                  {resend === 'sending' ? 'Sending…' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          )}
        </Notice>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="password">
            Password
          </label>
          <div className={styles.inputWrapper}>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className={styles.eyeButton}
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <a className={styles.googleButton} href="/auth/oauth/google">
        <GoogleIcon />
        Continue with Google
      </a>

      <div className={styles.footer}>
        <span>
          <Link className={styles.link} href="/forgot-password">
            Forgot your password?
          </Link>
        </span>
        <span>
          Don&apos;t have an account?{' '}
          <Link className={styles.link} href="/sign-up">
            Sign up
          </Link>
        </span>
      </div>
    </div>
  )
}

