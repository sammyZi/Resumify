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

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<LoginError | null>(null)
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent'>('idle')

  const oauthMessage =
    oauthError === 'cancelled'
      ? 'Sign-in was cancelled. You can try again below.'
      : oauthError === 'oauth_failed'
        ? 'Google sign-in failed. Please try again.'
        : null

  async function handleSubmit(e: React.FormEvent) {
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
        // 401 and any other non-success: generic, non-disclosing error.
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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <a className={styles.googleButton} href="/auth/oauth/google">
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
