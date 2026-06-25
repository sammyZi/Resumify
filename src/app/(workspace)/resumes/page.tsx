'use client'

/**
 * resumes/page.tsx — Resume list page.
 *
 * Lists all the user's resumes fetched via GET /api/resumes.
 * Provides a "New resume" button that calls POST /api/resumes.
 * Handles empty state and loading/error states.
 *
 * Requirements: 5.2, 5.3, 11.4, 11.5
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume } from '@/lib/types'
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

export default function ResumesPage() {
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

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Resumes</h1>
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
        <p className={styles.loading}>Loading resumes…</p>
      )}

      {isError && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to load resumes. Please refresh the page.
        </div>
      )}

      {!isLoading && !isError && resumes && resumes.length === 0 && (
        <div className={styles.emptyState}>
          <p>No resumes yet. Create your first one.</p>
        </div>
      )}

      {!isLoading && !isError && resumes && resumes.length > 0 && (
        <div className={styles.resumeList}>
          {resumes.map((resume) => (
            <Link
              key={resume.id}
              href={`/resumes/${resume.id}`}
              className={styles.resumeCard}
            >
              <div>
                <p className={styles.resumeCardName}>
                  {resume.fullName || 'Untitled resume'}
                </p>
                <p className={styles.resumeCardEmail}>{resume.email}</p>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ color: 'var(--color-text-secondary)', flexShrink: 0 }}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
