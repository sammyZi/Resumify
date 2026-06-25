'use client'

/**
 * profile/page.tsx — User Profile editor.
 *
 * Loads the user's profile via GET /api/profile and allows editing all
 * ResumeData fields (fullName, email, experience, education, skills).
 * Saves via PUT /api/profile.
 *
 * When profile is null (first-time user), shows an empty form.
 *
 * Features:
 * - Field-level validation error display (from API errors map)  (Req 11.8)
 * - Save-confirmation notice on success                         (Req 11.9)
 * - Save-failure + retry on 500                                 (Req 11.9)
 *
 * Requirements: 11.1, 11.8, 11.9
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { UserProfile, ResumeData } from '@/lib/types'
import { ResumeForm } from '../_components/resume-form'
import styles from '../_components/workspace-ui.module.css'

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<UserProfile | null> {
  const res = await fetch('/api/profile')
  if (res.status === 401) {
    window.location.href = '/login'
    return null
  }
  if (!res.ok) throw new Error('Failed to load profile')
  const data = await res.json()
  return (data.profile as UserProfile | null)
}

type SaveResult =
  | { success: true; profile: UserProfile }
  | { success: false; errors: Record<string, string[]> }
  | { success: false; message: string; retry: true }

async function saveProfile(body: ResumeData): Promise<SaveResult> {
  const res = await fetch('/api/profile', {
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

// ── Empty ResumeData for first-time users ─────────────────────────────────────

const emptyProfile: ResumeData = {
  fullName: '',
  email: '',
  experience: [],
  education: [],
  skills: [],
}

// ── Page component ────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  type SaveState = 'idle' | 'saved' | 'error' | 'retry'
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | null>(null)
  const [pendingData, setPendingData] = useState<ResumeData | null>(null)

  const {
    data: profile,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.profile(),
    queryFn: fetchProfile,
  })

  const saveMutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (result) => {
      if (result.success) {
        setSaveState('saved')
        setFieldErrors(null)
        setPendingData(null)
        queryClient.invalidateQueries({ queryKey: queryKeys.profile() })
        addToast('Profile saved successfully.', 'success')
      } else if ('errors' in result) {
        setFieldErrors(result.errors)
        setSaveState('error')
        setSaveErrorMsg('Please fix the errors below and try again.')
      } else if ('retry' in result) {
        setSaveState('retry')
        setSaveErrorMsg(result.message ?? 'Failed to save. Please retry.')
      }
    },
    onError: () => {
      setSaveState('retry')
      setSaveErrorMsg('Failed to save. Please try again.')
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
    return (
      <>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Profile</h1>
        </div>
        <p className={styles.loading}>Loading profile…</p>
      </>
    )
  }

  if (isError) {
    return (
      <>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Profile</h1>
        </div>
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to load profile. Please refresh the page.
        </div>
      </>
    )
  }

  const initialData: ResumeData = profile
    ? {
        fullName: profile.fullName,
        email: profile.email,
        experience: profile.experience,
        education: profile.education,
        skills: profile.skills,
      }
    : emptyProfile

  const saveNotice = (
    <>
      {saveState === 'saved' && (
        <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
          Profile saved successfully.
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
    </>
  )

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Profile</h1>
      </div>

      {!profile && (
        <div className={`${styles.notice} ${styles.noticeInfo}`} style={{ marginBottom: '1.5rem' }}>
          No profile saved yet. Fill in the form and save to create your profile.
          New resumes will be pre-filled from your profile.
        </div>
      )}

      <ResumeForm
        key={profile?.id ?? 'new'}
        initialData={initialData}
        isSaving={saveMutation.isPending}
        fieldErrors={fieldErrors}
        onSave={handleSave}
        saveNotice={saveNotice}
      />
    </>
  )
}
