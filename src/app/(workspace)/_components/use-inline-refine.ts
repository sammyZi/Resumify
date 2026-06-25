'use client'

/**
 * use-inline-refine.ts — hook for field-level AI refinement.
 *
 * Manages a map of pending/result state keyed by a string field identifier,
 * so many fields can track their own refine state independently without
 * cluttering the form with duplicated state variables.
 */

import { useState, useCallback } from 'react'

type FieldState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; value: string }
  | { status: 'error'; message: string }

type Scope =
  | { kind: 'summary' }
  | { kind: 'entry'; section: 'experience' | 'education'; index: number; field: 'description' }
  | { kind: 'section'; section: 'experience' | 'education' | 'skills' }
  | { kind: 'project_desc'; index: number }

export function useInlineRefine(resumeId: string | undefined) {
  const [states, setStates] = useState<Record<string, FieldState>>({})

  const set = useCallback((key: string, s: FieldState) => {
    setStates((prev) => ({ ...prev, [key]: s }))
  }, [])

  const stateFor = useCallback(
    (key: string): FieldState => states[key] ?? { status: 'idle' },
    [states]
  )

  const dismiss = useCallback(
    (key: string) => set(key, { status: 'idle' }),
    [set]
  )

  const fire = useCallback(
    async (
      key: string,
      scope: Record<string, unknown>,
      onAccept: (value: string) => void
    ) => {
      if (!resumeId) return
      set(key, { status: 'loading' })

      try {
        const url =
          resumeId === 'profile'
            ? '/api/profile/refine'
            : `/api/resumes/${resumeId}/refine`

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope }),
        })

        if (res.status === 401) {
          window.location.href = '/login'
          return
        }

        const data = await res.json()

        if (!res.ok) {
          set(key, { status: 'error', message: data.message ?? 'Refinement failed.' })
          return
        }

        const suggestion = data.suggestion
        // Extract the relevant text value from the suggestion
        let refined: string | null = null

        if (scope.kind === 'summary') {
          // Summary is not in the current refiner output — we handle it via
          // the 'all' scope and take the first experience description as a proxy.
          // Better: treat as description of first experience if present,
          // or return a placeholder. For now we send it as a description query.
          refined = suggestion?.description ?? null
        } else if (scope.kind === 'entry') {
          const sec = (scope as { section: 'experience' | 'education' }).section
          const idx = (scope as { index: number }).index
          const arr = suggestion?.[sec] as Array<{ description?: string }> | undefined
          refined = arr?.[0]?.description ?? null
        } else if (scope.kind === 'section' && (scope as { section: string }).section === 'skills') {
          const skills = suggestion?.skills as string[] | undefined
          refined = skills ? skills.join(', ') : null
        } else if (scope.kind === 'project_desc') {
          refined = suggestion?.description ?? null
        }

        if (refined !== null) {
          set(key, { status: 'done', value: refined })
        } else {
          set(key, { status: 'error', message: 'No suggestion returned for this field.' })
        }
      } catch {
        set(key, { status: 'error', message: 'Network error. Please try again.' })
      }
    },
    [resumeId, set]
  )

  return { stateFor, fire, dismiss }
}
