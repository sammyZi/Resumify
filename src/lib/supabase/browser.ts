/**
 * browser.ts — browser-side Supabase client.
 *
 * Uses @supabase/ssr createBrowserClient with the public anon key.
 * Safe to import from Client Components — contains no server secrets.
 *
 * Requirements: 10.1
 */

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env.public'

/**
 * Creates (or reuses) a browser-side Supabase client.
 * isSingleton=true ensures only one client instance per page load,
 * matching the recommended pattern for React client components.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    isSingleton: true,
  })
}
