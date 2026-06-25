import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: 'Reset password · Resumify',
}

/**
 * Reset-password page (/reset-password).
 *
 * ResetPasswordForm reads the `code` query param via useSearchParams, so it
 * must be wrapped in a Suspense boundary.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}
