'use client'

/**
 * confirmation-expired-form.tsx — shown when a sign-up confirmation link has
 * expired (activated more than 24h after issuance).
 *
 * Displays the link-expired message and offers to resend the confirmation
 * email via POST /auth/resend-confirmation, which returns a uniform response
 * to avoid account enumeration (Req 1.8).
 */

import { useState } from 'react'
import Link from 'next/link'
import styles from '../_components/auth-ui.module.css'
import { Notice } from '../_components/notice'

export function ConfirmationExpiredForm() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const res = await fetch('/auth/resend-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = (await res.json().catch(() => ({}))) as { message?: string }
      setMessage(data.message ?? 'Confirmation email sent if an account exists.')
    } catch {
      setMessage('Confirmation email sent if an account exists.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h1 className={styles.title}>Confirmation link expired</h1>
        <p className={styles.subtitle}>
          This confirmation link has expired. Enter your email and we&apos;ll send a
          new confirmation link.
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
          {submitting ? 'Sending…' : 'Resend confirmation email'}
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
