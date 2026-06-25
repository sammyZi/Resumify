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

/**
 * Compiles a LaTeX string into a PDF by calling the internal Tectonic service.
 *
 * - POSTs `latex` as `text/plain` to `${compilerUrl}/compile`
 * - Authenticates with `Authorization: Bearer ${compilerSecret}`
 * - Enforces a 30-second timeout via AbortSignal.timeout
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

  let response: Response
  try {
    response = await fetch(`${compilerUrl}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'Authorization': `Bearer ${compilerSecret}`,
      },
      body: latex,
      signal: AbortSignal.timeout(30_000),
    })
  } catch (cause) {
    // AbortError is thrown for user-initiated aborts; TimeoutError for AbortSignal.timeout
    const name = (cause as Error)?.name ?? ''
    if (name === 'AbortError' || name === 'TimeoutError') {
      return err({
        kind: 'timeout',
        detail: 'The LaTeX compiler did not respond within 30 seconds.',
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
