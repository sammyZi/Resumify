/**
 * env.ts — typed environment configuration.
 *
 * SERVER-ONLY secrets (serverEnv) are guarded by `server-only` so any
 * accidental import in a Client Component causes a build error.
 *
 * Public config (publicEnv) is re-exported from `env.public.ts` and is
 * safe to import anywhere, including Client Components.
 *
 * Requirements: 9.1, 10.1
 */

import 'server-only'

// ─── Helpers ──────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Ensure it is set in .env.local (development) or in the deployment environment.`
    )
  }
  return value
}

// ─── Server-only secrets ──────────────────────────────────────────────────
// Read at request time (dynamic rendering). Never bundled for the browser.

export const serverEnv = {
  /** Supabase service-role key — bypasses RLS; must remain server-side only. */
  supabaseServiceRoleKey: requireEnv('SUPABASE_SERVICE_ROLE_KEY'),

  /** OpenAI API key for AI LaTeX generation. */
  openaiApiKey: requireEnv('OPENAI_API_KEY'),

  /** Base URL of the internal Tectonic compile service. */
  compilerUrl: requireEnv('COMPILER_URL'),

  /** Shared secret for authenticating requests to the compile service. */
  compilerSecret: requireEnv('COMPILER_SECRET'),
} as const

// Re-export public config so callers that only need public vars can import
// from either this file or `env.public.ts`.
export { publicEnv } from '@/lib/env.public'
