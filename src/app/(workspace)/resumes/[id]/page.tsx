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
 * - Generation & Download panel: generate LaTeX, compile PDF, download (Req 6.2–6.4, 7.3–7.6)
 * - Sharing panel: create recruiter/template share links, list and revoke them (Req 8.1–8.7)
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 6.2, 6.3, 6.4, 7.3, 7.4, 7.5, 7.6, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 11.6, 11.7
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume, ResumeData, Share } from '@/lib/types'
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

// ── Generate API ──────────────────────────────────────────────────────────────

type GenerateResult =
  | { success: true; latex: string }
  | { success: false; error: 'missing_prerequisites'; missing: string[] }
  | { success: false; error: 'generation_failed'; message: string }
  | { success: false; error: 'save_failed'; latex: string }
  | { success: false; error: 'unknown'; message: string }

async function generateLatex(id: string): Promise<GenerateResult> {
  const res = await fetch(`/api/resumes/${id}/generate`, { method: 'POST' })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true, latex: data.latex as string }
  if (data.error === 'missing_prerequisites') {
    return { success: false, error: 'missing_prerequisites', missing: data.missing as string[] }
  }
  if (data.error === 'generation_failed') {
    return { success: false, error: 'generation_failed', message: data.message as string }
  }
  if (data.error === 'save_failed') {
    return { success: false, error: 'save_failed', latex: data.latex as string }
  }
  return { success: false, error: 'unknown', message: data.message ?? 'Unexpected error' }
}

// ── Compile API ───────────────────────────────────────────────────────────────

type CompileResult =
  | { success: true; pdfPath: string }
  | { success: false; error: 'no_latex_source'; message: string }
  | { success: false; error: 'compile_error'; detail: string }
  | { success: false; error: 'timeout'; message: string }
  | { success: false; error: 'storage_failed' | 'save_failed'; message: string; retry: true }
  | { success: false; error: 'unknown'; message: string }

async function compileLatex(id: string): Promise<CompileResult> {
  const res = await fetch(`/api/resumes/${id}/compile`, { method: 'POST' })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true, pdfPath: data.pdfPath as string }
  if (data.error === 'no_latex_source') {
    return { success: false, error: 'no_latex_source', message: data.message as string }
  }
  if (data.error === 'compile_error') {
    return { success: false, error: 'compile_error', detail: data.detail as string }
  }
  if (data.error === 'timeout') {
    return { success: false, error: 'timeout', message: data.message as string }
  }
  if (data.error === 'storage_failed' || data.error === 'save_failed') {
    return { success: false, error: data.error, message: data.message as string, retry: true }
  }
  return { success: false, error: 'unknown', message: data.message ?? 'Unexpected error' }
}

// ── Download API ──────────────────────────────────────────────────────────────

type DownloadResult =
  | { success: true; url: string }
  | { success: false; message: string }

async function fetchDownloadUrl(id: string): Promise<DownloadResult> {
  const res = await fetch(`/api/resumes/${id}/download`)
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json()
  if (res.ok) return { success: true, url: data.url as string }
  return { success: false, message: data.message ?? 'Failed to get download URL' }
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
  const router = useRouter()
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

  // ── Generation state ────────────────────────────────────────────────────────
  type GenerateState =
    | { kind: 'idle' }
    | { kind: 'success' }
    | { kind: 'missing_prerequisites'; missing: string[] }
    | { kind: 'generation_failed'; message: string }
    | { kind: 'save_failed' }
  const [generateState, setGenerateState] = useState<GenerateState>({ kind: 'idle' })
  const [generateAttempts, setGenerateAttempts] = useState(0)

  // ── Compile state ───────────────────────────────────────────────────────────
  type CompileState =
    | { kind: 'idle' }
    | { kind: 'success' }
    | { kind: 'no_latex_source' }
    | { kind: 'compile_error'; detail: string }
    | { kind: 'timeout' }
    | { kind: 'storage_error'; message: string }
  const [compileState, setCompileState] = useState<CompileState>({ kind: 'idle' })

  // ── Download state ──────────────────────────────────────────────────────────
  type DownloadState = 'idle' | 'loading' | 'error'
  const [downloadState, setDownloadState] = useState<DownloadState>('idle')
  const [downloadErrorMsg, setDownloadErrorMsg] = useState<string>('')

  // ── Share state ─────────────────────────────────────────────────────────────
  // Local list of non-revoked shares (populated on creation, removed on revoke).
  type ShareEntry = Share & { url: string }
  const [shares, setShares] = useState<ShareEntry[]>([])
  const [shareCreateError, setShareCreateError] = useState<string | null>(null)

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

  // ── Generate mutation ───────────────────────────────────────────────────────
  const generateMutation = useMutation({
    mutationFn: () => generateLatex(id),
    onSuccess: (result) => {
      if (result.success) {
        setGenerateState({ kind: 'success' })
        // Refresh resume so latexSource reflects new value
        queryClient.invalidateQueries({ queryKey: queryKeys.resume(id) })
      } else if (result.error === 'missing_prerequisites') {
        setGenerateState({ kind: 'missing_prerequisites', missing: result.missing })
      } else if (result.error === 'generation_failed') {
        setGenerateState({ kind: 'generation_failed', message: result.message })
      } else if (result.error === 'save_failed') {
        setGenerateState({ kind: 'save_failed' })
      } else {
        setGenerateState({ kind: 'generation_failed', message: 'Unexpected error during generation.' })
      }
    },
    onError: () => {
      setGenerateState({ kind: 'generation_failed', message: 'Network error. Please try again.' })
    },
  })

  // ── Compile mutation ────────────────────────────────────────────────────────
  const compileMutation = useMutation({
    mutationFn: () => compileLatex(id),
    onSuccess: (result) => {
      if (result.success) {
        setCompileState({ kind: 'success' })
        // Refresh resume so pdfPath is updated (enables download button)
        queryClient.invalidateQueries({ queryKey: queryKeys.resume(id) })
      } else if (result.error === 'no_latex_source') {
        setCompileState({ kind: 'no_latex_source' })
      } else if (result.error === 'compile_error') {
        setCompileState({ kind: 'compile_error', detail: result.detail })
      } else if (result.error === 'timeout') {
        setCompileState({ kind: 'timeout' })
      } else if (result.error === 'storage_failed' || result.error === 'save_failed') {
        setCompileState({ kind: 'storage_error', message: result.message })
      } else {
        setCompileState({ kind: 'storage_error', message: 'Unexpected error during compilation.' })
      }
    },
    onError: () => {
      setCompileState({ kind: 'storage_error', message: 'Network error. Please try again.' })
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

  // ── Generation handlers ─────────────────────────────────────────────────────
  function handleGenerate() {
    setGenerateState({ kind: 'idle' })
    setGenerateAttempts((n) => n + 1)
    generateMutation.mutate()
  }

  function handleGenerateRetry() {
    if (generateAttempts < 3) {
      handleGenerate()
    }
  }

  // ── Compile handler ─────────────────────────────────────────────────────────
  function handleCompile() {
    setCompileState({ kind: 'idle' })
    compileMutation.mutate()
  }

  // ── Download handler ────────────────────────────────────────────────────────
  async function handleDownload() {
    setDownloadState('loading')
    setDownloadErrorMsg('')
    try {
      const result = await fetchDownloadUrl(id)
      if (result.success) {
        window.open(result.url, '_blank', 'noopener,noreferrer')
        setDownloadState('idle')
      } else {
        setDownloadErrorMsg(result.message)
        setDownloadState('error')
      }
    } catch {
      setDownloadErrorMsg('Failed to get download URL.')
      setDownloadState('error')
    }
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
          ← Back to resumes
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
    experience: resume.experience,
    education: resume.education,
    skills: resume.skills,
  }

  // ── Generation Panel ────────────────────────────────────────────────────────
  // Req 6.2, 6.3, 6.4, 7.3, 7.4, 7.5, 7.6
  const hasPdf = Boolean(resume.pdfPath)

  const generationPanel = (
    <section className={styles.section} style={{ marginTop: '2rem' }}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Generation &amp; Download</h2>
      </div>

      {/* ── Generate ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={styles.button}
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating…' : 'Generate LaTeX'}
          </button>
          {generateMutation.isPending && (
            <span
              role="status"
              aria-live="polite"
              className={`${styles.notice} ${styles.noticeInfo}`}
              style={{ padding: '0.375rem 0.75rem' }}
            >
              Generating LaTeX source…
            </span>
          )}
        </div>

        {/* Generate feedback */}
        {!generateMutation.isPending && generateState.kind === 'success' && (
          <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
            LaTeX generated successfully.
          </div>
        )}
        {!generateMutation.isPending && generateState.kind === 'missing_prerequisites' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            Missing prerequisites:{' '}
            <strong>{generateState.missing.join(', ')}</strong>. Please save
            your resume data and select a template before generating.
          </div>
        )}
        {!generateMutation.isPending && generateState.kind === 'generation_failed' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <span>Generation failed: {generateState.message}</span>
            {generateAttempts < 3 && (
              <div className={styles.noticeAction}>
                <button
                  type="button"
                  onClick={handleGenerateRetry}
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
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
        {!generateMutation.isPending && generateState.kind === 'save_failed' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <span>LaTeX generated but failed to save. Please retry.</span>
            {generateAttempts < 3 && (
              <div className={styles.noticeAction}>
                <button
                  type="button"
                  onClick={handleGenerateRetry}
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
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Compile ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleCompile}
            disabled={compileMutation.isPending}
          >
            {compileMutation.isPending ? 'Compiling…' : 'Compile PDF'}
          </button>
          {compileMutation.isPending && (
            <span
              role="status"
              aria-live="polite"
              className={`${styles.notice} ${styles.noticeInfo}`}
              style={{ padding: '0.375rem 0.75rem' }}
            >
              Compiling PDF…
            </span>
          )}
        </div>

        {/* Compile feedback */}
        {!compileMutation.isPending && compileState.kind === 'success' && (
          <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
            PDF compiled successfully.
          </div>
        )}
        {!compileMutation.isPending && compileState.kind === 'no_latex_source' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            No LaTeX source. Generate first.
          </div>
        )}
        {!compileMutation.isPending && compileState.kind === 'compile_error' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            Compilation error: {compileState.detail}
          </div>
        )}
        {!compileMutation.isPending && compileState.kind === 'timeout' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            Compilation timed out (exceeded 30 seconds).
          </div>
        )}
        {!compileMutation.isPending && compileState.kind === 'storage_error' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            <span>{compileState.message}</span>
            <div className={styles.noticeAction}>
              <button
                type="button"
                onClick={handleCompile}
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
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Download ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          type="button"
          className={`${styles.button} ${styles.buttonSecondary}`}
          onClick={handleDownload}
          disabled={!hasPdf || downloadState === 'loading'}
          title={!hasPdf ? 'Compile a PDF first to enable download' : 'Download compiled PDF'}
        >
          {downloadState === 'loading' ? 'Preparing download…' : 'Download PDF'}
        </button>
        {downloadState === 'error' && (
          <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
            {downloadErrorMsg}
          </div>
        )}
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
        ← Back to resumes
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
        key={resume.id}
        initialData={initialData}
        isSaving={saveMutation.isPending}
        fieldErrors={fieldErrors}
        onSave={handleSave}
        extraActions={extraActions}
        saveNotice={saveNotice}
      />

      {generationPanel}

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