'use client'

/**
 * reset-password-form.tsx — custom in-app password reset page.
 *
 * Flow:
 *  1. The reset email links here with a `code` query param. On mount we
 *     exchange that code for a session via the browser Supabase client so the
 *     subsequent POST /auth/reset-password (which calls updateUser) has a
 *     valid session. (Req 3.3)
 *  2. If the code is missing/expired/used/invalid, we show a link-invalid
 *     message and offer to request a new reset email. (Req 3.6)
 *  3. The form accepts a new password + confirmation, posts to
 *     /auth/reset-password, and renders field-specific validation errors
 *     (8–128 chars, confirmation match) (Req 3.5) or a success confirmation
 *     (Req 3.4).
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

type Status = 'verifying' | 'ready' | 'invalid' | 'success'
type FieldErrors = { newPassword?: string; confirmPassword?: string }

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')

  const [status, setStatus] = useState<Status>('verifying')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  // ── Establish a session from the reset link before showing the form ──────
  useEffect(() => {
    let active = true

    async function verify() {
      const supabase = createSupabaseBrowserClient()
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!active) return
          setStatus(error ? 'invalid' : 'ready')
          return
        }
        // No code in the URL — the session may already exist (e.g. arrived
        // via the OAuth callback). Otherwise the link is invalid.
        const { data } = await supabase.auth.getSession()
        if (!active) return
        setStatus(data.session ? 'ready' : 'invalid')
      } catch {
        if (active) setStatus('invalid')
      }
    }

    verify()
    return () => {
      active = false
    }
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})

    try {
      const res = await fetch('/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword, confirmPassword }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        errors?: FieldErrors
        kind?: string
      }

      if (res.ok && data.success) {
        setStatus('success')
        return
      }

      if (res.status === 422) {
        setFieldErrors(data.errors ?? {})
      } else if (res.status === 400 || data.kind === 'token_invalid') {
        // Token expired/used/invalid — surface the link-invalid state.
        setStatus('invalid')
      } else {
        setFieldErrors({ newPassword: 'Something went wrong. Please try again.' })
      }
    } catch {
      setFieldErrors({ newPassword: 'Something went wrong. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  // ── Verifying the reset link ─────────────────────────────────────────────
  if (status === 'verifying') {
    return (
      <div className={styles.card}>
        <p className={styles.status}>Verifying your reset link…</p>
      </div>
    )
  }

  // ── Link invalid / expired / used (Req 3.6) ──────────────────────────────
  if (status === 'invalid') {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reset link no longer valid</h1>
        </div>
        <Notice variant="error">
          This password-reset link is invalid or has expired. Request a new one to
          continue.
        </Notice>
        <div className={styles.footer}>
          <Link className={styles.link} href="/forgot-password">
            Send a new reset link
          </Link>
        </div>
      </div>
    )
  }

  // ── Password successfully changed (Req 3.4) ──────────────────────────────
  if (status === 'success') {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Password updated</h1>
        </div>
        <Notice variant="success">
          Your password has been changed. You can now sign in with your new password.
        </Notice>
        <div className={styles.footer}>
          <Link className={styles.link} href="/login">
            Go to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ── Ready: show the new-password form ────────────────────────────────────
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Choose a new password</h1>
        <p className={styles.subtitle}>Enter and confirm your new password below.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="newPassword">
            New password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            className={`${styles.input} ${fieldErrors.newPassword ? styles.inputError : ''}`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            aria-invalid={fieldErrors.newPassword ? true : undefined}
            required
          />
          {fieldErrors.newPassword ? (
            <span className={styles.fieldError}>{fieldErrors.newPassword}</span>
          ) : (
            <span className={styles.subtitle}>Must be 8–128 characters.</span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="confirmPassword">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={fieldErrors.confirmPassword ? true : undefined}
            required
          />
          {fieldErrors.confirmPassword && (
            <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>
          )}
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
