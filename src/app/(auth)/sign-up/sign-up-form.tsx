'use client'

/**
 * sign-up-form.tsx — email/password sign-up form.
 *
 * Wires to POST /auth/sign-up and renders:
 *  - field-specific validation errors from the 422 { errors } payload (Req 1.6)
 *  - an "email already registered" message from the 409 payload (Req 1.4)
 *  - a success "check your email" confirmation on 200 (Req 1.1)
 *  - Google sign-in (Req 2.1)
 */

import { useState } from 'react'
import Link from 'next/link'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

type FieldErrors = { email?: string; password?: string }

export function SignUpForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
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
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={fieldErrors.password ? true : undefined}
            required
          />
          {fieldErrors.password ? (
            <span className={styles.fieldError}>{fieldErrors.password}</span>
          ) : (
            <span className={styles.subtitle}>Must be 8–128 characters.</span>
          )}
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className={styles.divider}>or</div>

      <a className={styles.googleButton} href="/auth/oauth/google">
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
