'use client'

/**
 * resumes/page.tsx — Dashboard.
 *
 * Lists all the user's resumes. Each card has a three-dot menu with:
 *   Share   — creates a recruiter share link and copies it to the clipboard
 *   Rename  — inline modal to update the resume's name (fullName)
 *   Delete  — confirmation modal
 *
 * Also supports importing a resume from a PDF upload.
 *
 * Requirements: 5.2, 5.3, 11.4, 11.5
 */

import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import { useUIStore } from '@/lib/stores/ui-store'
import type { Resume, ResumeData } from '@/lib/types'
import { getTemplateMeta } from '@/lib/templates/registry'
import { ConfirmModal } from '../_components/confirm-modal'
import { CardMenu } from '../_components/card-menu'
import { PdfImportButton } from '../_components/pdf-import-button'
import styles from '../_components/workspace-ui.module.css'

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchResumes(): Promise<Resume[]> {
  const res = await fetch('/api/resumes')
  if (res.status === 401) { window.location.href = '/login'; return [] }
  if (!res.ok) throw new Error('Failed to load resumes')
  return (await res.json()).resumes as Resume[]
}

async function createResumeApi(): Promise<Resume> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error('Failed to create resume')
  return (await res.json()).resume as Resume
}

async function saveResumeDataApi(id: string, data: ResumeData): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error('Failed to save resume data')
}

async function deleteResume(id: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, { method: 'DELETE' })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error('Failed to delete resume')
}

async function renameResume(id: string, title: string): Promise<void> {
  const res = await fetch(`/api/resumes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error('Failed to rename resume')
}

async function shareResume(resumeId: string): Promise<string> {
  const res = await fetch('/api/shares', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ resumeId, kind: 'recruiter' }),
  })
  if (res.status === 401) { window.location.href = '/login'; throw new Error('Unauthorized') }
  if (!res.ok) throw new Error('Failed to create share link')
  const { share } = await res.json()
  return `${window.location.origin}/s/${share.token}`
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ── Rename modal ──────────────────────────────────────────────────────────────

function RenameModal({
  current,
  onConfirm,
  onCancel,
  isPending,
}: {
  current: string
  onConfirm: (name: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [value, setValue] = useState(current)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onCancel])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (value.trim()) onConfirm(value.trim())
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'color-mix(in srgb, var(--color-text-primary) 40%, transparent)', backdropFilter: 'blur(3px)' }}
      onClick={onCancel}
    >
      <form
        style={{ width: '100%', maxWidth: '22rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 24px 48px color-mix(in srgb, var(--color-text-primary) 20%, transparent)' }}
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '1rem' }}>
          Rename resume
        </h2>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Full name"
          required
          style={{ marginBottom: '1.25rem' }}
        />
        <div style={{ display: 'flex', gap: '0.625rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            style={{ padding: '0.5625rem 1.125rem', font: 'inherit', fontSize: '0.875rem', fontWeight: 600, borderRadius: '10px', cursor: 'pointer', border: 'none', background: 'var(--color-border)', color: 'var(--color-text-primary)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || !value.trim()}
            className={styles.button}
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const addToast = useUIStore((s) => s.addToast)

  const [deleteTarget, setDeleteTarget] = useState<Resume | null>(null)
  const [renameTarget, setRenameTarget] = useState<Resume | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  const { data: resumes, isLoading, isError } = useQuery({
    queryKey: queryKeys.resumes(),
    queryFn: fetchResumes,
  })

  const createMutation = useMutation({
    mutationFn: createResumeApi,
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      router.push(`/resumes/${resume.id}`)
    },
    onError: () => addToast('Failed to create resume. Please try again.', 'error'),
  })

  // PDF import: create resume → save parsed data → navigate to editor
  async function handlePdfImport(data: ResumeData) {
    setIsImporting(true)
    try {
      const resume = await createResumeApi()
      await saveResumeDataApi(resume.id, data)
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      addToast('Resume imported from PDF!', 'success')
      router.push(`/resumes/${resume.id}`)
    } catch {
      addToast('Failed to create resume from PDF. Please try again.', 'error')
    } finally {
      setIsImporting(false)
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      addToast('Resume deleted.', 'success')
      setDeleteTarget(null)
    },
    onError: () => { addToast('Failed to delete resume.', 'error'); setDeleteTarget(null) },
  })

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameResume(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      addToast('Resume renamed.', 'success')
      setRenameTarget(null)
    },
    onError: () => { addToast('Failed to rename resume.', 'error') },
  })

  async function handleShare(resume: Resume) {
    setSharingId(resume.id)
    try {
      const url = await shareResume(resume.id)
      await navigator.clipboard.writeText(url).catch(() => {})
      addToast('Share link copied to clipboard.', 'success')
    } catch {
      addToast('Failed to create share link.', 'error')
    } finally {
      setSharingId(null)
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
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button
            type="button"
            className={styles.button}
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || isImporting}
          >
            {createMutation.isPending ? 'Creating…' : '+ New resume'}
          </button>
          <PdfImportButton
            onImport={handlePdfImport}
            disabled={createMutation.isPending || isImporting}
            label="Import from PDF"
          />
        </div>
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
            const name = resume.title || resume.fullName || 'Untitled resume'
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
                    <CardMenu
                      resumeName={name}
                      isSharing={sharingId === resume.id}
                      onShare={() => handleShare(resume)}
                      onRename={() => { setRenameTarget(resume) }}
                      onDelete={() => { setDeleteTarget(resume) }}
                    />
                  </div>
                </div>

                <div className={styles.dashboardCardBody}>
                  <p className={styles.resumeCardName}>{name}</p>
                  <p className={styles.resumeCardEmail}>
                    {resume.fullName && resume.title ? resume.fullName : resume.email || 'No email yet'}
                  </p>
                </div>

                <div className={styles.dashboardCardMeta}>
                  <span className={styles.metaChip}>{resume.experience.length} exp</span>
                  <span className={styles.metaChip}>{resume.education.length} edu</span>
                  <span className={styles.metaChip}>{resume.skills.length} skills</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete resume?"
          body={`"${deleteTarget.title || deleteTarget.fullName || 'Untitled resume'}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          isPending={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && (
        <RenameModal
          current={renameTarget.title || renameTarget.fullName || ''}
          isPending={renameMutation.isPending}
          onConfirm={(title) => renameMutation.mutate({ id: renameTarget.id, name: title })}
          onCancel={() => setRenameTarget(null)}
        />
      )}
    </>
  )
}
