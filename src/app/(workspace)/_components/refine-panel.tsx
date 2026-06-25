'use client'

/**
 * refine-panel.tsx — AI content refinement bar.
 *
 * Shown above the form. Calls POST /api/resumes/:id/refine (for resume editor)
 * or accepts a custom `onRefine` callback (for profile page — which calls the
 * same endpoint after saving the profile to a temp resume, or shows a warning).
 *
 * The caller passes `onAccept(suggestion)` to merge the result into their form.
 * Contact fields (email, phone, etc.) are never included in a suggestion.
 */

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { ExperienceEntry, EducationEntry } from '@/lib/types'
import styles from './refine-panel.module.css'

// ─── Types re-declared here (ai-refiner uses 'server-only') ─────────────────

export type RefineScope =
  | { kind: 'all' }
  | { kind: 'section'; section: 'experience' | 'education' | 'skills' }

export type RefinementSuggestion = {
  scope: RefineScope
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  skills?: string[]
}

type RefineResult =
  | { success: true; suggestion: RefinementSuggestion }
  | { success: false; error: 'empty_scope' | 'refinement_failed' | 'unknown'; message: string }

interface Props {
  /** Either a resume id (uses /api/resumes/:id/refine) or 'profile' (uses /api/profile/refine). */
  resumeId: string | 'profile'
  onAccept: (suggestion: RefinementSuggestion) => void
  /** When resumeId === 'profile', call to get the current unsaved form data to include in the request. */
  getData?: () => Record<string, unknown>
}

async function callRefine(
  resumeId: string | 'profile',
  scope: RefineScope,
  data?: Record<string, unknown>
): Promise<RefineResult> {
  const url =
    resumeId === 'profile'
      ? '/api/profile/refine'
      : `/api/resumes/${resumeId}/refine`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, ...(data ? { data } : {}) }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const body = await res.json()
  if (res.ok) return { success: true, suggestion: body.suggestion }
  return {
    success: false,
    error: body.error ?? 'unknown',
    message: body.message ?? 'Unexpected error',
  }
}

// ─── Sparkle icon ────────────────────────────────────────────────────────────

function SparkleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.94 2.5 12 7l5.06 2.07-5.06 2.06L9.94 17l-2.07-5.13L2 9.07 7.87 7z" />
      <path d="M16.8 15.1 18 18l3 1.2L18 20.4l-1.2 2.9-1.2-2.9L12.6 19.2l3-1.2z" />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RefinePanel({ resumeId, onAccept, getData }: Props) {
  type State =
    | { kind: 'idle' }
    | { kind: 'success'; suggestion: RefinementSuggestion }
    | { kind: 'error'; message: string }
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [attempts, setAttempts] = useState(0)
  const [lastScope, setLastScope] = useState<RefineScope | null>(null)

  const mutation = useMutation({
    mutationFn: (scope: RefineScope) =>
      callRefine(resumeId, scope, getData ? getData() : undefined),
    onSuccess: (result) => {
      if (result.success) {
        setState({ kind: 'success', suggestion: result.suggestion })
      } else {
        setState({ kind: 'error', message: result.message })
      }
    },
    onError: () => setState({ kind: 'error', message: 'Network error. Please try again.' }),
  })

  function fire(scope: RefineScope) {
    setState({ kind: 'idle' })
    setLastScope(scope)
    setAttempts((n) => n + 1)
    mutation.mutate(scope)
  }

  const busy = mutation.isPending
  const canRetry = state.kind === 'error' && attempts < 3 && lastScope

  const SCOPES: { scope: RefineScope; label: string }[] = [
    { scope: { kind: 'all' }, label: 'Refine all' },
    { scope: { kind: 'section', section: 'experience' }, label: 'Experience' },
    { scope: { kind: 'section', section: 'education' }, label: 'Education' },
    { scope: { kind: 'section', section: 'skills' }, label: 'Skills' },
  ]

  function activeLabel(scope: RefineScope) {
    if (!busy || !lastScope) return undefined
    if (scope.kind !== lastScope.kind) return undefined
    if (scope.kind === 'section' && lastScope.kind === 'section' && scope.section !== lastScope.section) return undefined
    return 'Refining…'
  }

  return (
    <div className={styles.panel}>
      <div className={styles.top}>
        <span className={styles.heading}>
          <SparkleIcon />
          AI Refinement
        </span>

        <div className={styles.chips}>
          {SCOPES.map(({ scope, label }) => (
            <button
              key={scope.kind === 'all' ? 'all' : scope.section}
              type="button"
              className={styles.chip}
              disabled={busy}
              onClick={() => fire(scope)}
            >
              {activeLabel(scope) ?? label}
            </button>
          ))}
        </div>
      </div>

      {/* Status row */}
      {busy && (
        <p className={styles.status} role="status" aria-live="polite">
          ✦ Generating suggestions…
        </p>
      )}

      {!busy && state.kind === 'error' && (
        <div className={styles.errorRow} role="alert">
          <span>{state.message}</span>
          {canRetry && (
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => fire(lastScope!)}
            >
              Retry
            </button>
          )}
        </div>
      )}

      {!busy && state.kind === 'success' && (
        <div className={styles.suggestionRow} role="region" aria-label="AI suggestion">
          <span className={styles.suggestionLabel}>
            ✓ Suggestion ready — review and decide
          </span>
          <div className={styles.suggestionActions}>
            <button
              type="button"
              className={styles.acceptBtn}
              onClick={() => {
                onAccept(state.suggestion)
                setState({ kind: 'idle' })
              }}
            >
              Accept
            </button>
            <button
              type="button"
              className={styles.discardBtn}
              onClick={() => setState({ kind: 'idle' })}
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
