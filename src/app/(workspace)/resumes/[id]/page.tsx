'use client'

/**
 * resumes/[id]/page.tsx — Resume data editor.
 *
 * Loads a specific resume via GET /api/resumes/:id and allows editing all
 * ResumeData fields. Saves via PUT /api/resumes/:id.
 *
 * Features:
 * - Field-level validation error display (from API errors map)
 * - Save-confirmation notice on success (Req 5.5)
 * - Save-failure + retry on 500 (Req 5.7)
 * - "Save to profile" button via POST /api/resumes/:id/save-to-profile (Req 11.7)
 * - Edits to resume do NOT automatically update the profile (Req 11.6)
 * - Preview & Download panel: links to the rendered template preview where the
 *   resume is downloaded as a PDF via the browser (no LaTeX, no compile service)
 * - Sharing panel: create recruiter/template share links, list and revoke them
 * - AI Content Refinement panel: refine all/section/entry, accept or discard
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 8.1–8.7, 11.6, 11.7, 12.1–12.11
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume, ResumeData, ExperienceEntry, EducationEntry, Share } from '@/lib/types'
import { ResumeForm } from '../../_components/resume-form'
import styles from '../../_components/workspace-ui.module.css'

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchResume(id: string): Promise<Resume> {
  const res = await fetch(`/api/resumes/${id}`)
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (res.status === 404) throw new Error('Resume not found')
  if (!res.ok) throw new Error('Failed to load resume')
  const data = await res.json()
  return data.resume as Resume
}

type SaveResult =
  | { success: true; resume: Resume }
  | { success: false; errors: Record<string, string[]> }
  | { success: false; message: string; retry: true }

async function saveResume(id: string, body: ResumeData): Promise<SaveResult> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res.json() as Promise<SaveResult>
}

type SaveToProfileResult =
  | { success: true }
  | { success: false; message?: string }

async function saveToProfile(id: string): Promise<SaveToProfileResult> {
  const res = await fetch(`/api/resumes/${id}/save-to-profile`, {
    method: 'POST',
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res.json() as Promise<SaveToProfileResult>
}

// ── Refine API ────────────────────────────────────────────────────────────────

// Re-declared locally (server-side ai-refiner.ts uses 'server-only'; types are pure TS).
type RefineScope =
  | { kind: 'all' }
  | { kind: 'section'; section: 'experience' | 'education' | 'skills' }
  | { kind: 'entry'; section: 'experience' | 'education'; index: number }

type RefinementSuggestion = {
  scope: RefineScope
  experience?: ExperienceEntry[]
  education?: EducationEntry[]
  skills?: string[]
}

type RefineResult =
  | { success: true; suggestion: RefinementSuggestion }
  | { success: false; error: 'empty_scope'; message: string }
  | { success: false; error: 'refinement_failed'; message: string }
  | { success: false; error: 'unknown'; message: string }

async function refineResume(id: string, scope: RefineScope): Promise<RefineResult> {
  const res = await fetch(`/api/resumes/${id}/refine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true, suggestion: data.suggestion as RefinementSuggestion }
  if (data.error === 'empty_scope') return { success: false, error: 'empty_scope', message: data.message }
  if (data.error === 'refinement_failed') return { success: false, error: 'refinement_failed', message: data.message }
  return { success: false, error: 'unknown', message: data.message ?? 'Unexpected error' }
}

// ── Share API ─────────────────────────────────────────────────────────────────

type ShareKind = 'recruiter' | 'template'

type CreateShareResult =
  | { success: true; share: { id: string; token: string; kind: ShareKind; resumeId: string } }
  | { success: false; message: string }

async function createShare(resumeId: string, kind: ShareKind): Promise<CreateShareResult> {
  const res = await fetch('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId, kind }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true, share: data.share }
  return { success: false, message: data.error ?? 'Failed to create share link.' }
}

type RevokeShareResult =
  | { success: true }
  | { success: false; message: string }

async function revokeShare(shareId: string): Promise<RevokeShareResult> {
  const res = await fetch(`/api/shares/${shareId}/revoke`, { method: 'POST' })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true }
  return { success: false, message: data.error ?? 'Failed to revoke share.' }
}

// ── Share URL builder ─────────────────────────────────────────────────────────

function buildShareUrl(token: string, kind: ShareKind): string {
  const origin = window.location.origin
  return kind === 'recruiter' ? `${origin}/s/${token}` : `${origin}/t/${token}`
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  // Save feedback state
  type SaveState = 'idle' | 'saved' | 'error' | 'retry'
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
  // Pending save data for retry
  const [pendingData, setPendingData] = useState<ResumeData | null>(null)

  // Save-to-profile feedback
  const [s2pState, setS2pState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── Share state ─────────────────────────────────────────────────────────────
  // Local list of non-revoked shares (populated on creation, removed on revoke).
  type ShareEntry = Share & { url: string }
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [shareCreateError, setShareCreateError] = useState<string | null>(null)

  // ── Refinement state ─────────────────────────────────────────────────────────
  type RefineState =
    | { kind: 'idle' }
    | { kind: 'success'; suggestion: RefinementSuggestion }
    | { kind: 'empty_scope'; message: string }
    | { kind: 'failed'; message: string }
  const [refineState, setRefineState] = useState<RefineState>({ kind: 'idle' })
  const [refineAttempts, setRefineAttempts] = useState(0)
  const [activeScope, setActiveScope] = useState<RefineScope | null>(null)
  // draftData holds accepted suggestion content; re-keys the form on accept
  const [draftData, setDraftData] = useState<ResumeData | null>(null)
  const [draftKey, setDraftKey] = useState(0)

  const {
    data: resume,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.resume(id),
    queryFn: () => fetchResume(id),
  })

  const saveMutation = useMutation({
    mutationFn: (data: ResumeData) => saveResume(id, data),
    onSuccess: (result) => {
      if (result.success) {
        setSaveState('saved')
        setFieldErrors(null)
        setPendingData(null)
        queryClient.invalidateQueries({ queryKey: queryKeys.resume(id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      } else if ('errors' in result) {
        // Validation errors (422)
        setFieldErrors(result.errors)
        setSaveState('error')
        setSaveErrorMsg('Please fix the errors below and try again.')
      } else if ('retry' in result) {
        // Server error with retry (500)
        setSaveState('retry')
        setSaveErrorMsg(result.message ?? 'Failed to save. Please retry.')
      }
    },
    onError: () => {
      setSaveState('retry')
      setSaveErrorMsg('Failed to save. Please try again.')
    },
  })

  const s2pMutation = useMutation({
    mutationFn: () => saveToProfile(id),
    onMutate: () => setS2pState('saving'),
    onSuccess: (result) => {
      if (result.success) {
        setS2pState('saved')
        queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
        addToast('Profile updated from resume.', 'success')
      } else {
        setS2pState('error')
      }
    },
    onError: () => {
      setS2pState('error')
    },
  })

  // ── Refine mutation ───────────────────────────────────────────────────────
  const refineMutation = useMutation({
    mutationFn: (scope: RefineScope) => refineResume(id, scope),
    onSuccess: (result) => {
      if (result.success) {
        setRefineState({ kind: 'success', suggestion: result.suggestion })
      } else if (result.error === 'empty_scope') {
        setRefineState({ kind: 'empty_scope', message: result.message })
      } else {
        setRefineState({ kind: 'failed', message: result.message })
      }
    },
    onError: () => {
      setRefineState({ kind: 'failed', message: 'Network error. Please try again.' })
    },
  })

  function handleSave(data: ResumeData) {
    setSaveState('idle')
    setFieldErrors(null)
    setPendingData(data)
    saveMutation.mutate(data)
  }

  function handleRetry() {
    if (pendingData) {
      setSaveState('idle')
      saveMutation.mutate(pendingData)
    }
  }

  // ── Share handlers ────────────────────────────────────────────────────────

  const createShareMutation = useMutation({
    mutationFn: (kind: ShareKind) => createShare(id, kind),
    onSuccess: (result) => {
      if (result.success) {
        setShareCreateError(null)
        const url = buildShareUrl(result.share.token, result.share.kind as ShareKind)
        setShares((prev) => [
          ...prev,
          {
            id: result.share.id,
            token: result.share.token,
            kind: result.share.kind as ShareKind,
            resumeId: result.share.resumeId,
            ownerId: '',
            revoked: false,
            url,
          },
        ])
      } else {
        setShareCreateError(result.message)
      }
    },
    onError: () => {
      setShareCreateError('Failed to create share link. Please try again.')
    },
  })

  const revokeShareMutation = useMutation({
    mutationFn: (shareId: string) => revokeShare(shareId),
    onSuccess: (result, shareId) => {
      if (result.success) {
        setShares((prev) => prev.filter((s) => s.id !== shareId))
        addToast('Share revoked.', 'success')
      } else {
        addToast(result.message, 'error')
      }
    },
    onError: () => {
      addToast('Failed to revoke share. Please try again.', 'error')
    },
  })

  // ── Refine handlers ───────────────────────────────────────────────────────

  function handleRefine(scope: RefineScope) {
    setRefineState({ kind: 'idle' })
    setActiveScope(scope)
    setRefineAttempts((n) => n + 1)
    refineMutation.mutate(scope)
  }

  function handleRefineRetry() {
    if (activeScope && refineAttempts < 3) {
      handleRefine(activeScope)
    }
  }

  function handleAcceptSuggestion(suggestion: RefinementSuggestion) {
    // Apply suggestion fields onto current data (contact fields are never touched — Req 12.6)
    const base: ResumeData = draftData ?? {
      fullName: resume!.fullName,
      email: resume!.email,
      phone: resume!.phone,
      location: resume!.location,
      summary: resume!.summary,
      links: resume!.links,
      experience: resume!.experience,
      projects: resume!.projects,
      education: resume!.education,
      certifications: resume!.certifications,
      skills: resume!.skills,
      achievements: resume!.achievements,
    }

    const updated: ResumeData = {
      ...base,
      ...(suggestion.experience !== undefined ? { experience: suggestion.experience } : {}),
      ...(suggestion.education !== undefined ? { education: suggestion.education } : {}),
      ...(suggestion.skills !== undefined ? { skills: suggestion.skills } : {}),
    }
    setDraftData(updated)
    setDraftKey((k) => k + 1) // force form re-mount with new data (Req 12.5)
    setRefineState({ kind: 'idle' })
  }

  function handleDiscardSuggestion() {
    // Req 12.7: discard leaves original field content unchanged
    setRefineState({ kind: 'idle' })
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return <p className={styles.loading}>Loading resume…</p>
  }

  if (isError || !resume) {
    const msg = error instanceof Error ? error.message : 'Failed to load resume'
    return (
      <>
        <Link href="/resumes" className={styles.backLink}>
          ← Back to dashboard
        </Link>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          {msg}
        </div>
      </>
    )
  }

  const initialData: ResumeData = {
    fullName: resume.fullName,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    summary: resume.summary,
    links: resume.links,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    skills: resume.skills,
    achievements: resume.achievements,
  }

  // ── Refinement Panel ─────────────────────────────────────────────────────
  const refinementPanel = (
    <section className={styles.section} style={{ marginTop: '2rem' }}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>AI Content Refinement</h2>
        <span className={styles.entryCardTitle}>Optional — never required to save or download</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => handleRefine({ kind: 'all' })}
            disabled={refineMutation.isPending}
          >
            {refineMutation.isPending && activeScope?.kind === 'all' ? 'Refining…' : 'Refine all'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={() => handleRefine({ kind: 'section', section: 'experience' })}
            disabled={refineMutation.isPending}
          >
            {refineMutation.isPending && activeScope?.kind === 'section' && activeScope.section === 'experience' ? 'Refining…' : 'Refine experience'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={() => handleRefine({ kind: 'section', section: 'education' })}
            disabled={refineMutation.isPending}
          >
            {refineMutation.isPending && activeScope?.kind === 'section' && activeScope.section === 'education' ? 'Refining…' : 'Refine education'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={() => handleRefine({ kind: 'section', section: 'skills' })}
            disabled={refineMutation.isPending}
          >
            {refineMutation.isPending && activeScope?.kind === 'section' && activeScope.section === 'skills' ? 'Refining…' : 'Refine skills'}
          </button>
        </div>

        {/* In-progress indicator — Req 12.11 */}
        {refineMutation.isPending && (
          <span
            role="status"
            aria-live="polite"
            className={`${styles.notice} ${styles.noticeInfo}`}
            style={{ padding: '0.375rem 0.75rem' }}
          >
            Refining content…
          </span>
        )}

        {/* Empty scope error — Req 12.9 */}
        {!refineMutation.isPending && refineState.kind === 'empty_scope' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            {refineState.message}
          </div>
        )}

        {/* Failure with retry — Req 12.10 */}
        {!refineMutation.isPending && refineState.kind === 'failed' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <span>Refinement failed: {refineState.message}</span>
            {refineAttempts < 3 && (
              <div className={styles.noticeAction}>
                <button
                  type="button"
                  onClick={handleRefineRetry}
                  style={{
                    font: 'inherit', fontSize: '0.875rem', fontWeight: 600,
                    color: 'var(--color-primary)', background: 'none', border: 'none',
                    padding: 0, cursor: 'pointer', textDecoration: 'underline',
                  }}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}

        {/* Suggestion review — Req 12.5, 12.6, 12.7 */}
        {!refineMutation.isPending && refineState.kind === 'success' && (
          <div className={`${styles.notice} ${styles.noticeInfo}`} role="region" aria-label="Refinement suggestion">
            <strong>AI suggestion ready.</strong> Review the changes and choose to accept or discard.
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                className={styles.button}
                onClick={() => handleAcceptSuggestion(refineState.suggestion)}
              >
                Accept suggestion
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleDiscardSuggestion}
              >
                Discard
              </button>
            </div>
            <p style={{ marginTop: '0.5rem', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
              Accepting will update the form fields. Changes are not saved until you click Save.
            </p>
          </div>
        )}
      </div>
    </section>
  )

  // ── Preview & Download Panel ──────────────────────────────────────────────
  const previewPanel = (
    <section className={styles.section} style={{ marginTop: '2rem' }}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Preview &amp; Download</h2>
      </div>

      <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>
        See your resume rendered in the selected template and download it as a PDF.
        {resume.templateId
          ? ''
          : ' No template selected yet — the Classic template is used by default.'}
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <Link href={`/resumes/${id}/preview`} className={styles.button}>
          Preview &amp; download
        </Link>
        <Link
          href={`/templates/${id}`}
          className={`${styles.button} ${styles.buttonSecondary}`}
        >
          Choose template
        </Link>
      </div>
    </section>
  )

  const saveNotice = (
    <>
      {saveState === 'saved' && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
          Resume saved successfully.
        </div>
      )}
      {saveState === 'error' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          {saveErrorMsg}
        </div>
      )}
      {saveState === 'retry' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <span>{saveErrorMsg}</span>
          <div className={styles.noticeAction}>
            <button
              type="button"
              onClick={handleRetry}
              disabled={saveMutation.isPending}
              style={{
                font: 'inherit',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-primary)',
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {saveMutation.isPending ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        </div>
      )}
      {s2pState === 'saved' && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
          Profile updated from this resume.
        </div>
      )}
      {s2pState === 'error' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to save to profile. Please try again.
        </div>
      )}
    </>
  )

  const extraActions = (
    <button
      type="button"
      className={`${styles.button} ${styles.buttonSecondary}`}
      onClick={() => s2pMutation.mutate()}
      disabled={s2pMutation.isPending}
      title="Copy this resume's data to your profile"
    >
      {s2pMutation.isPending ? 'Saving…' : 'Save to profile'}
    </button>
  )

  return (
    <>
      <Link href="/resumes" className={styles.backLink}>
        ← Back to dashboard
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {resume.fullName ? `${resume.fullName}'s resume` : 'Edit resume'}
        </h1>
        <Link
          href={`/templates/${id}`}
          className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
        >
          Change template
        </Link>
      </div>

      <ResumeForm
        key={`${resume.id}-${draftKey}`}
        initialData={draftData ?? initialData}
        isSaving={saveMutation.isPending}
        fieldErrors={fieldErrors}
        onSave={handleSave}
        extraActions={extraActions}
        saveNotice={saveNotice}
      />

      {refinementPanel}

      {previewPanel}

      {/* ── Sharing panel ──────────────────────────────────────────────── */}
      <div className={styles.section} style={{ marginTop: '2rem' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Sharing</h2>
        </div>

        {/* Create share buttons */}
        <div className={styles.shareCreateButtons}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={() => createShareMutation.mutate('recruiter')}
            disabled={createShareMutation.isPending}
          >
            {createShareMutation.isPending ? 'Creating…' : 'Share with recruiter'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={() => createShareMutation.mutate('template')}
            disabled={createShareMutation.isPending}
          >
            {createShareMutation.isPending ? 'Creating…' : 'Share template'}
          </button>
        </div>

        {/* Create error */}
        {shareCreateError && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            {shareCreateError}
          </div>
        )}

        {/* Share list */}
        {shares.length > 0 && (
          <div className={styles.shareList}>
            {shares.map((share) => (
              <ShareItem
                key={share.id}
                share={share}
                onRevoke={() => revokeShareMutation.mutate(share.id)}
                isRevoking={
                  revokeShareMutation.isPending &&
                  revokeShareMutation.variables === share.id
                }
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

// ── ShareItem component ───────────────────────────────────────────────────────

type ShareItemProps = {
  share: { id: string; kind: 'recruiter' | 'template'; url: string }
  onRevoke: () => void
  isRevoking: boolean
}

function ShareItem({ share, onRevoke, isRevoking }: ShareItemProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(share.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available; silently fail
    }
  }

  return (
    <div className={styles.shareItem}>
      <span
        className={`${styles.shareKindBadge} ${
          share.kind === 'recruiter' ? styles.shareKindRecruiter : styles.shareKindTemplate
        }`}
      >
        {share.kind === 'recruiter' ? 'Recruiter' : 'Template'}
      </span>
      <span className={styles.shareUrl} title={share.url}>
        {share.url}
      </span>
      <div className={styles.shareActions}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
          onClick={handleCopy}
          aria-label="Copy share link"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonDanger}`}
          onClick={onRevoke}
          disabled={isRevoking}
          aria-label="Revoke share link"
        >
          {isRevoking ? 'Revoking…' : 'Revoke'}
        </button>
      </div>
    </div>
  )
}
