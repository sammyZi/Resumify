'use client'

/**
 * resumes/page.tsx — Dashboard.
 *
 * The user's home base after login. Lists all resumes fetched via
 * GET /api/resumes and provides a "New resume" action (POST /api/resumes).
 * Handles loading, error and empty states.
 *
 * Note: the route stays /resumes (referenced by the root redirect, nav and
 * editor navigation); the user-facing name is "Dashboard".
 *
 * Requirements: 5.2, 5.3, 11.4, 11.5
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume } from '@/lib/types'
import { getTemplateMeta } from '@/lib/templates/registry'
import styles from '../_components/workspace-ui.module.css'

async function fetchResumes(): Promise<Resume[]> {
  const res = await fetch('/api/resumes')
  if (res.status === 401) {
    window.location.href = '/login'
    return []
  }
  if (!res.ok) throw new Error('Failed to load resumes')
  const data = await res.json()
  return data.resumes as Resume[]
}

async function createResume(): Promise<Resume> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error('Failed to create resume')
  const data = await res.json()
  return data.resume as Resume
}

async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error('Failed to delete resume')
}

/** Build up-to-two-letter initials from a name (falls back to a glyph). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const { data: resumes, isLoading, isError } = useQuery({
    queryKey: queryKeys.resumes(),
    queryFn: fetchResumes,
  })

  const createMutation = useMutation({
    mutationFn: createResume,
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      router.push(`/resumes/${resume.id}`)
    },
    onError: () => {
      addToast('Failed to create resume. Please try again.', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      addToast('Resume deleted.', 'success')
    },
    onError: () => {
      addToast('Failed to delete resume. Please try again.', 'error')
    },
  })

  function handleDelete(e: React.MouseEvent, resume: Resume) {
    // The card is a link; prevent navigation when deleting.
    e.preventDefault()
    e.stopPropagation()
    const name = resume.fullName || 'Untitled resume'
    if (window.confirm(`Delete "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(resume.id)
    }
  }

  const count = resumes?.length ?? 0

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>
            {isLoading
              ? 'Loading your resumes…'
              : count === 0
                ? 'Create your first resume to get started.'
                : `You have ${count} resume${count === 1 ? '' : 's'}.`}
          </p>
        </div>
        <button
          type="button"
          className={styles.button}
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Creating…' : '+ New resume'}
        </button>
      </div>

      {isLoading && (
        <div className={styles.cardGrid} aria-hidden="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {isError && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to load resumes. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && count === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="12" y1="18" x2="12" y2="12" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No resumes yet</p>
          <p>Create your first resume and let AI help you fill it in.</p>
          <button
            type="button"
            className={styles.button}
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            style={{ marginTop: '1rem' }}
          >
            {createMutation.isPending ? 'Creating…' : '+ New resume'}
          </button>
        </div>
      )}

      {!isLoading && !isError && resumes && count > 0 && (
        <div className={styles.cardGrid}>
          {resumes.map((resume) => {
            const name = resume.fullName || 'Untitled resume'
            return (
              <Link
                key={resume.id}
                href={`/resumes/${resume.id}`}
                className={styles.dashboardCard}
              >
                <div className={styles.dashboardCardTop}>
                  <span className={styles.avatar} aria-hidden="true">
                    {initials(name)}
                  </span>
                  <div className={styles.dashboardCardTopRight}>
                    {resume.templateId ? (
                      <span className={`${styles.statusBadge} ${styles.statusBadgeReady}`}>
                        {getTemplateMeta(resume.templateId).name}
                      </span>
                    ) : (
                      <span className={styles.statusBadge}>No template</span>
                    )}
                    <button
                      type="button"
                      className={styles.cardDeleteButton}
                      onClick={(e) => handleDelete(e, resume)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Delete ${name}`}
                      title="Delete resume"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className={styles.dashboardCardBody}>
                  <p className={styles.resumeCardName}>{name}</p>
                  <p className={styles.resumeCardEmail}>
                    {resume.email || 'No email yet'}
                  </p>
                </div>

                <div className={styles.dashboardCardMeta}>
                  <span className={styles.metaChip}>
                    {resume.experience.length} exp
                  </span>
                  <span className={styles.metaChip}>
                    {resume.education.length} edu
                  </span>
                  <span className={styles.metaChip}>
                    {resume.skills.length} skills
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </>
  )
}
