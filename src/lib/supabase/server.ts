/**
 * server.ts — cookie-bound Supabase client for Route Handlers and Server Components.
 *
 * Uses @supabase/ssr createServerClient with the modern getAll/setAll cookie
 * interface so session tokens are properly read and written on every request.
 *
 * This client uses the anon key and is subject to Row-Level Security policies.
 *
 * Requirements: 10.1, 10.2
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env.public'

/**
 * Creates a Supabase client bound to the current request's cookie store.
 * Must be called inside a Route Handler or Server Component (async context).
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // setAll is called from Server Components where setting cookies is
          // not possible. The middleware must handle session refresh instead.
          // Silently ignore here — no session mutation happens in read-only RSC.
        }
      },
    },
  })
}
