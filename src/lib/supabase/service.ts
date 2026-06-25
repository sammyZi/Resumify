/**
 * service.ts — service-role Supabase client, SERVER ONLY.
 *
 * Uses the service role key which bypasses Row-Level Security entirely.
 * Only use this client where RLS bypass is intentional and the access is
 * constrained programmatically (e.g., share token resolution).
 *
 * The `server-only` import causes a build error if this module is ever
 * accidentally imported into a Client Component or the browser bundle.
 *
 * Requirements: 10.1, 10.2
 */

import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env'
import { publicEnv } from '@/lib/env.public'

/**
 * Service-role client — bypasses RLS. Use sparingly and deliberately.
 * Instantiated lazily; safe to call multiple times (supabase-js is
 * internally singleton-aware per key).
 */
export function createSupabaseServiceClient() {
  return createClient(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: {
      // Service role clients should not persist sessions or auto-refresh tokens.
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
