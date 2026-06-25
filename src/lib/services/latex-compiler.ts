/**
 * latex-compiler.ts — LaTeX_Compiler: adapter for the internal Tectonic service.
 *
 * Server-only module. POSTs raw LaTeX source to the Tectonic compile endpoint
 * and returns the compiled PDF bytes, or a typed CompileError on failure.
 *
 * Requirements: 7.1, 7.4, 7.5
 */

import 'server-only'

import { serverEnv } from '@/lib/env'
import { ok, err, type Result, type CompileError } from '@/lib/result'

// ─── compile ─────────────────────────────────────────────────────────────────

// Total timeout budget: 90 s (covers Render free-tier cold start ~60 s + compile time)
const COMPILE_TIMEOUT_MS = 90_000

// Wake-up ping timeout: how long to wait for the service to respond to a health check
const WAKE_PING_TIMEOUT_MS = 70_000

/**
 * Pings the compiler's health endpoint to wake it up if it has been spun down
 * (Render free tier spins down after 15 minutes of inactivity).
 *
 * Resolves as soon as the service responds with any status, or after
 * WAKE_PING_TIMEOUT_MS — whichever comes first. Errors are swallowed
 * intentionally; the compile call that follows will surface any real failure.
 */
async function wakeUp(compilerUrl: string): Promise<void> {
  try {
    await fetch(`${compilerUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(WAKE_PING_TIMEOUT_MS),
    })
  } catch {
    // Ignore — service may not have a /health route, or may still be booting.
    // The compile call will fail with a proper error if the service is down.
  }
}

/**
 * Compiles a LaTeX string into a PDF by calling the internal Tectonic service.
 *
 * - Pings `${compilerUrl}/health` first to wake up the service if it has been
 *   spun down (handles Render free-tier cold starts, ~30–60 s).
 * - POSTs `latex` as `text/plain` to `${compilerUrl}/compile`
 * - Authenticates with `Authorization: Bearer ${compilerSecret}`
 * - Enforces a 90-second timeout via AbortSignal.timeout
 *
 * On success: returns `ok({ pdf })` where `pdf` is the raw PDF bytes.
 * On non-2xx: returns `err({ kind: 'compile_error', detail })` with the
 *   response body as detail.
 * On timeout: returns `err({ kind: 'timeout', detail })`.
 *
 * Requirements: 7.1, 7.4, 7.5
 */
export async function compile(
  latex: string
): Promise<Result<{ pdf: Uint8Array }, CompileError>> {
  const { compilerUrl, compilerSecret } = serverEnv

  // Wake up the service before compiling — no-op if it is already running.
  await wakeUp(compilerUrl)

  let response: Response
  try {
    response = await fetch(`${compilerUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${compilerSecret}`,
      },
      body: latex,
      signal: AbortSignal.timeout(COMPILE_TIMEOUT_MS),
    })
  } catch (cause) {
    // AbortError is thrown for user-initiated aborts; TimeoutError for AbortSignal.timeout
    const name = (cause as Error)?.name ?? ''
    if (name === 'AbortError' || name === 'TimeoutError') {
      return err({
        kind: 'timeout',
        detail: 'The LaTeX compiler did not respond within 90 seconds.',
      })
    }
    // Network-level failure — surface as a compile_error so callers have a
    // single non-timeout error path.
    return err({
      kind: 'compile_error',
      detail: (cause as Error)?.message ?? 'Network error contacting compiler',
    })
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => `HTTP ${response.status}`)
    return err({ kind: 'compile_error', detail })
  }

  const buffer = await response.arrayBuffer()
  const pdf = new Uint8Array(buffer)
  return ok({ pdf })
}
