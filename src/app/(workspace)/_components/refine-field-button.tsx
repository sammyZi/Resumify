'use client'

/**
 * refine-field-button.tsx — inline AI refine icon + accept/discard popover.
 *
 * Renders a small sparkle button next to a textarea label. On click it calls
 * the refine API with the given scope, extracts the relevant text value, and
 * shows a compact accept/discard inline UI beneath the textarea.
 *
 * The parent passes `onAccept(value)` to apply the refined text.
 */

import { useState } from 'react'
import styles from './refine-field-button.module.css'

type FieldScope =
  | { kind: 'entry'; section: 'experience' | 'education'; index: number }
  | { kind: 'section'; section: 'experience' | 'education' | 'skills' }

interface Props {
  /** resume id, or 'profile' for the profile page */
  resumeId: string
  /** Which scope to call — drives which part of the suggestion we extract. */
  scope: FieldScope
  /** Which text field to extract from the returned entry/section. */
  extract: 'description' | 'skills'
  /** Called with the refined text string when the user accepts. */
  onAccept: (value: string) => void
  /** Disabled while the form is saving. */
  disabled?: boolean
  /** When resumeId === 'profile', supply current unsaved form data. */
  getData?: () => Record<string, unknown>
}

type State =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; value: string }
  | { phase: 'error'; message: string }

function SparkleIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9.94 2.5 12 7l5.06 2.07-5.06 2.06L9.94 17l-2.07-5.13L2 9.07 7.87 7z" />
      <path d="M16.8 15.1 18 18l3 1.2L18 20.4l-1.2 2.9-1.2-2.9L12.6 19.2l3-1.2z" />
    </svg>
  )
}

async function callRefine(
  resumeId: string,
  scope: FieldScope,
  extract: Props['extract'],
  data?: Record<string, unknown>
): Promise<string | null> {
  const url =
    resumeId === 'profile'
      ? '/api/profile/refine'
      : `/api/resumes/${resumeId}/refine`

  const apiScope =
    scope.kind === 'entry'
      ? { kind: 'entry', section: scope.section, index: scope.index }
      : { kind: 'section', section: scope.section }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: apiScope, ...(data ? { data } : {}) }),
  })

  if (res.status === 401) {
    window.location.href = '/login'
    return null
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.message ?? 'Refinement failed.')
  }

  const body = await res.json()
  const suggestion = body.suggestion as Record<string, unknown> | undefined

  if (extract === 'skills') {
    const skills = suggestion?.skills as string[] | undefined
    return skills && skills.length > 0 ? skills.join(', ') : null
  }

  // extract === 'description'
  if (scope.kind === 'entry') {
    const arr = (suggestion?.[scope.section] as Array<{ description?: string }> | undefined)
    return arr?.[0]?.description ?? null
  }

  // section — take first entry's description
  const arr = (suggestion?.[(scope as { section: string }).section] as Array<{ description?: string }> | undefined)
  return arr?.[0]?.description ?? null
}

export function RefineFieldButton({ resumeId, scope, extract, onAccept, disabled, getData }: Props) {
  const [state, setState] = useState<State>({ phase: 'idle' })

  async function handleClick() {
    if (state.phase === 'loading') return
    setState({ phase: 'loading' })
    try {
      const value = await callRefine(resumeId, scope, extract, getData ? getData() : undefined)
      if (value) {
        setState({ phase: 'ready', value })
      } else {
        setState({ phase: 'error', message: 'No suggestion returned.' })
      }
    } catch (e) {
      setState({ phase: 'error', message: e instanceof Error ? e.message : 'Failed.' })
    }
  }

  function handleAccept() {
    if (state.phase !== 'ready') return
    onAccept(state.value)
    setState({ phase: 'idle' })
  }

  function handleDiscard() {
    setState({ phase: 'idle' })
  }

  return (
    <span className={styles.root}>
      <button
        type="button"
        className={`${styles.btn} ${state.phase === 'loading' ? styles.btnLoading : ''}`}
        onClick={handleClick}
        disabled={disabled || state.phase === 'loading'}
        title="Refine with AI"
        aria-label="Refine this field with AI"
      >
        <SparkleIcon />
        {state.phase === 'loading' ? <span className={styles.spinner} /> : null}
      </button>

      {state.phase === 'ready' && (
        <span className={styles.popover}>
          <span className={styles.popoverLabel}>AI suggestion ready</span>
          <span className={styles.popoverActions}>
            <button type="button" className={styles.acceptBtn} onClick={handleAccept}>
              Accept
            </button>
            <button type="button" className={styles.discardBtn} onClick={handleDiscard}>
              ✕
            </button>
          </span>
        </span>
      )}

      {state.phase === 'error' && (
        <span className={styles.errorInline} role="alert">
          {state.message}
          <button type="button" className={styles.discardBtn} onClick={handleDiscard}>
            ✕
          </button>
        </span>
      )}
    </span>
  )
}
