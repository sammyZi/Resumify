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
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 11.6, 11.7
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume, ResumeData } from '@/lib/types'
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
    </>
  )
}
