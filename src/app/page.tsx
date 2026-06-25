import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Root route — resolves the user's authentication state and redirects:
 *   - Authenticated  → /dashboard (workspace, Requirement 1.2, 2.2, 2.3)
 *   - Unauthenticated → /login    (Requirement 10.1)
 *
 * There is no UI to render here; the redirect happens before any HTML
 * is sent to the browser.
 */
export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  } else {
    redirect('/login')
  }
}
