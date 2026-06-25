/**
 * field-errors.tsx — renders field-level validation error messages.
 *
 * Accepts the `errors` map returned by the API (Record<string, string[]>)
 * and a `field` key path to display.
 *
 * Requirements: 5.3, 5.6, 11.8
 */

import styles from './workspace-ui.module.css'

interface FieldErrorsProps {
  errors: Record<string, string[]> | null | undefined
  field: string
}

export function FieldErrors({ errors, field }: FieldErrorsProps) {
  const messages = errors?.[field]
  if (!messages || messages.length === 0) return null

  return (
    <div role="alert" aria-live="polite">
      {messages.map((msg, i) => (
        <p key={i} className={styles.fieldError}>
          {msg}
        </p>
      ))}
    </div>
  )
}
