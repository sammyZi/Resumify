/**
 * env.public.ts — public (browser-safe) environment config.
 *
 * Import this file from Client Components, browser utilities, or anywhere
 * that should not pull in server-only code.
 *
 * These variables use the NEXT_PUBLIC_ prefix and are inlined into the
 * client bundle at build time by Next.js.
 *
 * Requirements: 9.1, 10.1
 */

function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required public environment variable: ${name}. ` +
        `Ensure it is set in .env.local (development) or in the deployment environment.`
    )
  }
  return value
}

export const publicEnv = {
  /** Supabase project URL — safe for the browser. */
  supabaseUrl: requirePublicEnv(
    'NEXT_PUBLIC_SUPABASE_URL',
    // Static reference (not dynamic indexing) so Next.js inlines it into the
    // client bundle at build time.
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),

  /** Supabase anon/public API key — safe for the browser. */
  supabaseAnonKey: requirePublicEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
} as const
