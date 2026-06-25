'use client'

/**
 * confirm-modal.tsx — reusable confirmation modal.
 *
 * Accessible dialog with a title, body, and two actions (confirm + cancel).
 * Closes on backdrop click, Escape, or either action button.
 * The confirm button can carry a `variant` to style destructive actions.
 */

import { useEffect, useRef } from 'react'
import styles from './confirm-modal.module.css'

interface Props {
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isPending = false,
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Lock scroll and auto-focus the confirm button.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    confirmRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onClick={onCancel}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-body"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className={styles.title}>{title}</h2>
        <p id="modal-body" className={styles.body}>{body}</p>

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnCancel}`}
            onClick={onCancel}
            disabled={isPending}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.btn} ${variant === 'danger' ? styles.btnDanger : styles.btnPrimary}`}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
