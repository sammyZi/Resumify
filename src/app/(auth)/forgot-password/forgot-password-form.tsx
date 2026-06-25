'use client'

/**
 * forgot-password-form.tsx — request a password-reset email.
 *
 * Wires to POST /auth/forgot-password, which always returns the same uniform
 * confirmation regardless of whether the email is registered, preventing
 * account enumeration (Req 3.2).
 */

import { useState } from 'react'
import Link from 'next/link'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      setMessage(
        data.message ?? 'If that email is registered, you will receive a reset link.'
      )
    } catch {
      // Even on a network error we keep the response uniform (no enumeration).
      setMessage('If that email is registered, you will receive a reset link.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reset your password</h1>
        <p className={styles.subtitle}>
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {message && <Notice variant="success">{message}</Notice>}

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

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className={styles.footer}>
        <Link className={styles.link} href="/login">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
