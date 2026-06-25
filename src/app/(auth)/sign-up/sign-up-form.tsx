'use client'

/**
 * sign-up-form.tsx — email/password sign-up form.
 */

import { useState } from 'react'
import Link from 'next/link'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

type FieldErrors = { email?: string; password?: string }

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58Z" />
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

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setFieldErrors({})
    setFormError(null)
    setSuccess(null)

    try {
      const res = await fetch('/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        message?: string
        errors?: FieldErrors
      }

      if (res.ok && data.success) {
        setSuccess(data.message ?? 'Check your email to confirm your account.')
        return
      }

      if (res.status === 422) {
        setFieldErrors(data.errors ?? {})
      } else if (res.status === 409) {
        setFormError(data.message ?? 'Email already registered')
      } else {
        setFormError(data.message ?? 'Sign-up failed. Please try again.')
      }
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Check your email</h1>
        </div>
        <Notice variant="success">{success}</Notice>
        <div className={styles.footer}>
          <Link className={styles.link} href="/login">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start building professional resumes in minutes.</p>
      </div>

      {formError && <Notice variant="error">{formError}</Notice>}

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
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={fieldErrors.email ? true : undefined}
            required
          />
          {fieldErrors.email && (
            <span className={styles.fieldError}>{fieldErrors.email}</span>
          )}
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
              autoComplete="new-password"
              className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={fieldErrors.password ? true : undefined}
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
          {fieldErrors.password ? (
            <span className={styles.fieldError}>{fieldErrors.password}</span>
          ) : (
            <span className={styles.hint}>Must be 8–128 characters.</span>
          )}
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <a className={styles.googleButton} href="/auth/oauth/google">
        <GoogleIcon />
        Continue with Google
      </a>

      <div className={styles.footer}>
        <span>
          Already have an account?{' '}
          <Link className={styles.link} href="/login">
            Sign in
          </Link>
        </span>
      </div>
    </div>
  )
}

