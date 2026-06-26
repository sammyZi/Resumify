import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { LandingPage } from './_components/landing-page'

/**
 * Root route — resolves the user's authentication state:
 *   - Authenticated  → Redirect to /resumes (app workspace)
 *   - Unauthenticated → Render modern tech LandingPage
 */
export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/resumes')
  }

  return <LandingPage />
}
