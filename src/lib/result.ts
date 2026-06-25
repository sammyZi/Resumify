/**
 * Result<T, E> — a discriminated union for typed error handling.
 *
 * Successful outcome:  { ok: true;  value: T }
 * Failed outcome:      { ok: false; error: E }
 */
export type Result<T, E = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E }

// ─── Constructor helpers ───────────────────────────────────────────────────

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value }
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

// ─── Shared error types ────────────────────────────────────────────────────

/**
 * Generic application-level error.
 */
export type AppError = {
  code: string
  message: string
}

/**
 * CompileError — holds structured detail returned by the Tectonic compiler.
 * Satisfies Requirement 7 (LaTeX compilation).
 */
export type CompileError = {
  kind: 'compile_error' | 'timeout'
  /** Raw compiler output (log lines, error messages) */
  detail: string
}

/**
 * ShareError — covers failures during share token resolution.
 * Satisfies Requirement 8 (Sharing).
 */
export type ShareError = {
  kind: 'not_found' | 'revoked' | 'access_denied'
  message: string
}
