import { Suspense } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
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
export default async function LoginPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/resumes')
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
