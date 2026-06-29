'use client'

/**
 * resumes/[id]/page.tsx — Resume data editor.
 *
 * Features:
 * - AI Refine panel above the form (RefinePanel component)
 * - Field-level validation, save/retry, save-to-profile
 * - Preview & Download + Change template actions
 * - Sharing panel (create recruiter/template links, revoke)
 * - Import from PDF resume upload
 *
 * Requirements: 5.1–5.7, 8.1–8.7, 11.6, 11.7, 12.1–12.11
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume, ResumeData } from '@/lib/types'
import { ResumeForm } from '../../_components/resume-form'
import { PdfImportButton } from '../../_components/pdf-import-button'
import { ShareModal } from '../../_components/share-modal'
import { JobMatchModal } from '../../_components/job-match-modal'
import type { RefinementSuggestion } from '../../_components/refine-panel'
import styles from '../../_components/workspace-ui.module.css'

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchResume(id: string): Promise<Resume> {
  const res = await fetch(`/api/resumes/${id}`)
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (res.status === 404) throw new Error('Resume not found')
  if (!res.ok) throw new Error('Failed to load resume')
  return (await res.json()).resume as Resume
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
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  return res.json() as Promise<SaveResult>
}

async function saveToProfile(id: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`/api/resumes/${id}/save-to-profile`, { method: 'POST' })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  return res.json()
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ResumeEditorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  type SaveState = 'idle' | 'saved' | 'error' | 'retry'
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
  const [pendingData, setPendingData] = useState<ResumeData | null>(null)
  const [s2pState, setS2pState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Draft from refine acceptance — re-keys the form to pick up new initial data
  const [draftData, setDraftData] = useState<ResumeData | null>(null)
  const [draftKey, setDraftKey] = useState(0)

  const [shareOpen, setShareOpen] = useState(false)
  const [matchOpen, setMatchOpen] = useState(false)

  const { data: resume, isLoading, isError, error } = useQuery({
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
        setFieldErrors(result.errors)
        setSaveState('error')
        setSaveErrorMsg('Please fix the errors below and try again.')
      } else if ('retry' in result) {
        setSaveState('retry')
        setSaveErrorMsg(result.message ?? 'Failed to save. Please retry.')
      }
    },
    onError: () => { setSaveState('retry'); setSaveErrorMsg('Failed to save. Please try again.') },
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
    onError: () => setS2pState('error'),
  })

  function handleSave(data: ResumeData) {
    setSaveState('idle')
    setFieldErrors(null)
    setPendingData(data)
    saveMutation.mutate(data)
  }

  function handleRetry() {
    if (pendingData) { setSaveState('idle'); saveMutation.mutate(pendingData) }
  }

  function handleAcceptSuggestion(suggestion: RefinementSuggestion) {
    if (!resume) return
    const base: ResumeData = draftData ?? {
      fullName: resume.fullName, email: resume.email, phone: resume.phone,
      location: resume.location, summary: resume.summary, links: resume.links,
      experience: resume.experience, projects: resume.projects, education: resume.education,
      certifications: resume.certifications, skills: resume.skills, achievements: resume.achievements,
    }
    setDraftData({
      ...base,
      ...(suggestion.experience !== undefined ? { experience: suggestion.experience } : {}),
      ...(suggestion.education !== undefined ? { education: suggestion.education } : {}),
      ...(suggestion.skills !== undefined ? { skills: suggestion.skills } : {}),
    })
    setDraftKey((k) => k + 1)
  }

  function handlePdfImport(importedData: ResumeData) {
    setDraftData(importedData)
    setDraftKey((k) => k + 1)
    setSaveState('idle')
    setFieldErrors(null)
    addToast('Resume imported from PDF — review the fields and save.', 'success')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <p className={styles.loading}>Loading resume…</p>

  if (isError || !resume) {
    const msg = error instanceof Error ? error.message : 'Failed to load resume'
    return (
      <>
        <Link href="/resumes" className={styles.backLink}>← Back to dashboard</Link>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">{msg}</div>
      </>
    )
  }

  const initialData: ResumeData = {
    fullName: resume.fullName, email: resume.email, phone: resume.phone,
    location: resume.location, summary: resume.summary, links: resume.links,
    experience: resume.experience, projects: resume.projects, education: resume.education,
    certifications: resume.certifications, skills: resume.skills, achievements: resume.achievements,
  }

  const saveNotice = (
    <>
      {saveState === 'saved' && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">Resume saved.</div>
      )}
      {saveState === 'error' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">{saveErrorMsg}</div>
      )}
      {saveState === 'retry' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <span>{saveErrorMsg}</span>
          <div className={styles.noticeAction}>
            <button type="button" onClick={handleRetry} disabled={saveMutation.isPending}
              style={{ font: 'inherit', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-primary)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline' }}>
              {saveMutation.isPending ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        </div>
      )}
      {s2pState === 'saved' && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">Profile updated.</div>
      )}
      {s2pState === 'error' && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">Failed to save to profile.</div>
      )}
    </>
  )

  return (
    <>
      <Link href="/resumes" className={styles.backLink}>← Back to dashboard</Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          {resume.fullName ? `${resume.fullName}'s resume` : 'Edit resume'}
        </h1>
        <div className={styles.actionToolbar}>
          <PdfImportButton
            onImport={handlePdfImport}
            disabled={saveMutation.isPending}
          />
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => setMatchOpen(true)}>
            <span className={styles.buttonIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span> Job match
          </button>
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => setShareOpen(true)}>
            <span className={styles.buttonIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></span> Share
          </button>
          <Link href={`/templates/${id}`} className={`${styles.button} ${styles.buttonSecondary}`}>
            <span className={styles.buttonIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg></span> Template
          </Link>
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <ResumeForm
        key={`${resume.id}-${draftKey}`}
        initialData={draftData ?? initialData}
        isSaving={saveMutation.isPending}
        fieldErrors={fieldErrors}
        onSave={handleSave}
        resumeId={id}
        extraActions={
          <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => s2pMutation.mutate()} disabled={s2pMutation.isPending}
            title="Copy this resume's data to your profile">
            {s2pMutation.isPending ? 'Saving…' : 'Save to profile'}
          </button>
        }
        saveNotice={saveNotice}
      />

      {/* ── Action cards ─────────────────────────────────────────────── */}
      <div className={styles.sectionGrid}>
        {/* Preview & Download */}
        <div className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <span className={styles.actionCardIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg></span>
            <span className={styles.actionCardTitle}>Preview &amp; Download</span>
          </div>
          <p className={styles.actionCardDesc}>
            See your resume rendered in the selected template and download it as a PDF.
            {!resume.templateId ? ' No template selected — Classic is used by default.' : ''}
          </p>
          <div className={styles.actionCardActions}>
            <Link href={`/resumes/${id}/preview`} className={styles.button}>Preview &amp; download</Link>
            <Link href={`/templates/${id}`} className={`${styles.button} ${styles.buttonSecondary}`}>Choose template</Link>
          </div>
        </div>

        {/* Tailor to a job */}
        <div className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <span className={styles.actionCardIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></span>
            <span className={styles.actionCardTitle}>Tailor to a Job</span>
          </div>
          <p className={styles.actionCardDesc}>
            Paste a job description to see how well this resume matches, your estimated
            chance of selection, and what to improve.
          </p>
          <div className={styles.actionCardActions}>
            <button type="button" className={styles.button} onClick={() => setMatchOpen(true)}>
              Check job match
            </button>
          </div>
        </div>

        {/* Sharing */}
        <div className={styles.actionCard}>
          <div className={styles.actionCardHeader}>
            <span className={styles.actionCardIcon}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></span>
            <span className={styles.actionCardTitle}>Sharing</span>
          </div>
          <p className={styles.actionCardDesc}>
            Create recruiter or template links and manage existing ones.
          </p>
          <div className={styles.actionCardActions}>
            <button type="button" className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={() => setShareOpen(true)}>
              Manage share links
            </button>
          </div>
        </div>
      </div>

      {shareOpen && (
        <ShareModal
          resumeId={id}
          resumeName={resume.title || resume.fullName || 'Untitled resume'}
          onClose={() => setShareOpen(false)}
        />
      )}

      {matchOpen && (
        <JobMatchModal
          resumeId={id}
          resumeName={resume.title || resume.fullName || 'Untitled resume'}
          onClose={() => setMatchOpen(false)}
          onTailor={(tailored) => {
            const base: ResumeData = draftData ?? initialData
            setDraftData({
              ...base,
              skills: tailored.skills,
              experience: tailored.experience,
              summary: tailored.summary,
            })
            setDraftKey((k) => k + 1)
            addToast('Resume tailored — review the changes and save.', 'success')
          }}
        />
      )}
    </>
  )
}
