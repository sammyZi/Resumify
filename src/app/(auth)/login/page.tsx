import { Suspense } from 'react'
import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in · Resumify',
}

/**
 * Login page (/login).
 *
 * LoginForm reads the ?error= query param (OAuth cancel/failure) via
 * useSearchParams, so it must be wrapped in a Suspense boundary.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
