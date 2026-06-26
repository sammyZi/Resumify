import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { SignUpForm } from './sign-up-form'

export const metadata: Metadata = {
  title: 'Sign up · Resumify',
}

export default async function SignUpPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/resumes')
  }

  return <SignUpForm />
}
