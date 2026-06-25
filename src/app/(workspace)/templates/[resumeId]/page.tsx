'use client'

/**
 * templates/[resumeId]/page.tsx — Template gallery for a specific resume.
 *
 * Displays all available templates with role-category filtering.  The user can
 * select a template and apply it to the resume.
 *
 * Features:
 * - Fetches all templates via GET /api/templates (Req 4.6)
 * - Role-category filter derived from the loaded template list (Req 4.7)
 * - Empty state when no templates exist (Req 4.2)
 * - Empty state when no templates match the selected filter (Req 4.7)
 * - Highlights the currently applied template (Req 4.1)
 * - Apply template via PUT /api/resumes/:id/template (Req 4.3)
 * - Success notice on apply (Req 4.3)
 * - Error notice on failure, retaining previous template (Req 4.4)
 * - Note about default template when none selected (Req 4.5)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7
 */

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import type { Template, Resume } from '@/lib/types'
import styles from '../../_components/workspace-ui.module.css'

// ── API helpers ───────────────────────────────────────────────────────────────

async function fetchTemplates(): Promise<Template[]> {
  const res = await fetch('/api/templates')
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error('Failed to load templates')
  const data = await res.json()
  return data.templates as Template[]
}

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

type ApplyResult =
  | { success: true }
  | { success: false; message: string; retry: true }

async function applyTemplate(
  resumeId: string,
  templateId: string
): Promise<ApplyResult> {
  const res = await fetch(`/api/resumes/${resumeId}/template`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res.json() as Promise<ApplyResult>
}

// ── Resume icon ───────────────────────────────────────────────────────────────

function ResumeIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: Template
  isSelected: boolean
  isApplying: boolean
  onApply: (templateId: string) => void
}

function TemplateCard({ template, isSelected, isApplying, onApply }: TemplateCardProps) {
  return (
    <div
      className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ''}`}
      aria-label={`Template: ${template.name}`}
    >
      <div className={styles.templateCardPreview}>
        <ResumeIcon />
        <span>{template.name}</span>
      </div>

      <div className={styles.templateCardBody}>
        <div className={styles.templateCardName}>{template.name}</div>
        <div className={styles.templateCardCategory}>{template.roleCategory}</div>

        {isSelected ? (
          <div className={styles.templateCardApplied} aria-live="polite">
            ✓ Applied
          </div>
        ) : (
          <button
            type="button"
            className={styles.templateCardApplyButton}
            disabled={isApplying}
            onClick={() => onApply(template.id)}
          >
            {isApplying ? 'Applying…' : 'Apply'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Page component ────────────────────────────────────────────────────────────

const ALL_CATEGORY = '__all__'

export default function TemplateGalleryPage({
  params,
}: {
  params: Promise<{ resumeId: string }>
}) {
  const { resumeId } = use(params)
  const queryClient = useQueryClient()

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const [applyState, setApplyState] = useState<'idle' | 'success' | 'error'>('idle')
  const [applyError, setApplyError] = useState<string>('')
  // Track the current templateId in local state so we can optimistically update
  // on success and retain the previous value on failure.
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null | undefined>(undefined)

  // Load all templates (unfiltered — we derive categories client-side).
  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
  } = useQuery({
    queryKey: queryKeys.templates(),
    queryFn: fetchTemplates,
  })

  // Load the resume to know its current templateId.
  const {
    data: resume,
    isLoading: resumeLoading,
  } = useQuery({
    queryKey: queryKeys.resume(resumeId),
    queryFn: () => fetchResume(resumeId),
    // Once loaded, initialise local currentTemplateId state.
    select: (data) => data,
  })

  // Sync resume.templateId into local state on first load.
  // We use a ref-style pattern: if currentTemplateId is still `undefined`
  // (sentinel "not yet initialised"), pull from the fetched resume.
  const resolvedTemplateId =
    currentTemplateId !== undefined ? currentTemplateId : (resume?.templateId ?? null)

  // Derive unique categories from the template list.
  const categories = useMemo(() => {
    if (!templates) return []
    const seen = new Set<string>()
    for (const t of templates) {
      seen.add(t.roleCategory)
    }
    return Array.from(seen).sort()
  }, [templates])

  // Filtered templates based on the active category.
  const filteredTemplates = useMemo(() => {
    if (!templates) return []
    if (activeCategory === ALL_CATEGORY) return templates
    return templates.filter((t) => t.roleCategory === activeCategory)
  }, [templates, activeCategory])

  const applyMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) =>
      applyTemplate(resumeId, templateId),
    onSuccess: (result, variables) => {
      if (result.success) {
        setCurrentTemplateId(variables.templateId)
        setApplyState('success')
        setApplyError('')
        // Invalidate so the resume editor reflects the new template.
        queryClient.invalidateQueries({ queryKey: queryKeys.resume(resumeId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      } else {
        // Failure — retain previous templateId (do NOT call setCurrentTemplateId).
        setApplyState('error')
        setApplyError(result.message ?? 'Failed to apply template.')
      }
    },
    onError: () => {
      setApplyState('error')
      setApplyError('Failed to apply template. Please try again.')
    },
  })

  function handleApply(templateId: string) {
    setApplyState('idle')
    applyMutation.mutate({ templateId })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = templatesLoading || resumeLoading

  const resumeName = resume?.fullName
    ? `${resume.fullName}'s resume`
    : 'resume'

  return (
    <>
      <Link href={`/resumes/${resumeId}`} className={styles.backLink}>
        ← Back to resume
      </Link>

      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Choose a template</h1>
      </div>

      {/* Notices */}
      {applyState === 'success' && (
        <div
          className={`${styles.notice} ${styles.noticeSuccess}`}
          role="status"
          style={{ marginBottom: '1.25rem' }}
        >
          Template applied to {resumeName}.
        </div>
      )}

      {applyState === 'error' && (
        <div
          className={`${styles.notice} ${styles.noticeError}`}
          role="alert"
          style={{ marginBottom: '1.25rem' }}
        >
          {applyError}
        </div>
      )}

      {/* Default-template note when no template is selected */}
      {resolvedTemplateId === null && (
        <div
          className={`${styles.notice} ${styles.noticeInfo}`}
          role="note"
          style={{ marginBottom: '1.25rem' }}
        >
          No template selected. A default template will be used when compiling
          your resume.
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <p className={styles.loading}>Loading templates…</p>
      )}

      {/* Error state */}
      {!isLoading && templatesError && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to load templates. Please refresh the page.
        </div>
      )}

      {/* Empty state — no templates at all (Req 4.2) */}
      {!isLoading && !templatesError && templates && templates.length === 0 && (
        <div className={styles.emptyState}>
          No templates available.
        </div>
      )}

      {/* Gallery */}
      {!isLoading && !templatesError && templates && templates.length > 0 && (
        <>
          {/* Category filter */}
          <div className={styles.galleryFilters} role="group" aria-label="Filter by category">
            <button
              type="button"
              className={`${styles.filterButton} ${activeCategory === ALL_CATEGORY ? styles.filterButtonActive : ''}`}
              onClick={() => setActiveCategory(ALL_CATEGORY)}
              aria-pressed={activeCategory === ALL_CATEGORY}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`${styles.filterButton} ${activeCategory === cat ? styles.filterButtonActive : ''}`}
                onClick={() => setActiveCategory(cat)}
                aria-pressed={activeCategory === cat}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Empty state — no templates match filter (Req 4.7) */}
          {filteredTemplates.length === 0 && (
            <div className={styles.emptyState}>
              No templates match the selected category.
            </div>
          )}

          {/* Template grid */}
          {filteredTemplates.length > 0 && (
            <div className={styles.galleryGrid}>
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={resolvedTemplateId === template.id}
                  isApplying={
                    applyMutation.isPending &&
                    applyMutation.variables?.templateId === template.id
                  }
                  onApply={handleApply}
                />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}
