'use client'

/**
 * templates/[resumeId]/page.tsx — Template gallery for a specific resume.
 *
 * Displays the predefined templates (lib/templates/registry) with role-category
 * filtering and a live, scaled preview rendered from the resume's own data. The
 * user can apply a template to the resume.
 *
 * Features:
 * - Predefined templates from the code registry (Req 4.6)
 * - Role-category filter derived from the template list (Req 4.7)
 * - Highlights the currently applied template (Req 4.1)
 * - Apply template via PUT /api/resumes/:id/template (Req 4.3)
 * - Success notice on apply (Req 4.3); error retains previous template (Req 4.4)
 * - Note about the default template when none is selected (Req 4.5)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 4.7
 */

import { use, useState, useMemo } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import type { Resume, ResumeData } from '@/lib/types'
import { TEMPLATES, DEFAULT_TEMPLATE_ID, type TemplateMeta } from '@/lib/templates/registry'
import { ResumeDocument } from '@/lib/templates/resume-document'
import { SAMPLE_RESUME } from '@/lib/templates/sample'
import { TemplatePreviewModal } from '../_components/template-preview-modal'
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

// ── Template card ─────────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TemplateMeta
  isSelected: boolean
  isApplying: boolean
  onApply: (templateId: string) => void
  onPreview: (templateId: string) => void
}

function TemplateCard({ template, isSelected, isApplying, onApply, onPreview }: TemplateCardProps) {
  return (
    <div
      className={`${styles.templateCard} ${isSelected ? styles.templateCardSelected : ''}`}
      aria-label={`Template: ${template.name}`}
    >
      {/* Scaled-down preview rendered with sample data. */}
      <button
        type="button"
        className={styles.templateCardPreview}
        onClick={() => onPreview(template.id)}
        aria-label={`Preview ${template.name} template`}
      >
        <div className={styles.templateThumb} aria-hidden="true">
          <ResumeDocument templateId={template.id} data={SAMPLE_RESUME} />
        </div>
        <span className={styles.templateThumbHint}>Preview</span>
      </button>

      <div className={styles.templateCardBody}>
        <div className={styles.templateCardName}>{template.name}</div>
        <div className={styles.templateCardCategory}>{template.roleCategory}</div>
        <p className={styles.templateCardDesc}>{template.description}</p>

        <div className={styles.templateCardActions}>
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
  const [previewId, setPreviewId] = useState<string | null>(null)
  // Track the current templateId locally so we can optimistically update on
  // success and retain the previous value on failure.
  const [currentTemplateId, setCurrentTemplateId] = useState<string | null | undefined>(undefined)

  // Load the resume to know its current templateId and to render previews.
  const {
    data: resume,
    isLoading: resumeLoading,
    isError: resumeError,
  } = useQuery({
    queryKey: queryKeys.resume(resumeId),
    queryFn: () => fetchResume(resumeId),
  })

  const resolvedTemplateId =
    currentTemplateId !== undefined ? currentTemplateId : (resume?.templateId ?? null)

  // Categories derived from the registry.
  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const t of TEMPLATES) seen.add(t.roleCategory)
    return Array.from(seen).sort()
  }, [])

  const filteredTemplates = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return TEMPLATES
    return TEMPLATES.filter((t) => t.roleCategory === activeCategory)
  }, [activeCategory])

  const applyMutation = useMutation({
    mutationFn: ({ templateId }: { templateId: string }) =>
      applyTemplate(resumeId, templateId),
    onSuccess: (result, variables) => {
      if (result.success) {
        setCurrentTemplateId(variables.templateId)
        setApplyState('success')
        setApplyError('')
        queryClient.invalidateQueries({ queryKey: queryKeys.resume(resumeId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      } else {
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

  // Use the resume's real data when it has content, otherwise sample data so
  // previews always look complete.
  const hasContent =
    Boolean(resume?.fullName) ||
    (resume?.experience.length ?? 0) > 0 ||
    (resume?.education.length ?? 0) > 0 ||
    (resume?.skills.length ?? 0) > 0

  const previewData: ResumeData = hasContent
    ? {
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
    : SAMPLE_RESUME

  const resumeName = resume?.fullName ? `${resume.fullName}'s resume` : 'resume'

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
          No template selected. The{' '}
          <strong>{TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)?.name}</strong>{' '}
          template is used by default.
        </div>
      )}

      {/* Loading / error states for the resume */}
      {resumeLoading && <p className={styles.loading}>Loading templates…</p>}

      {!resumeLoading && resumeError && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          Failed to load your resume. Please refresh the page.
        </div>
      )}

      {!resumeLoading && !resumeError && (
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

          {filteredTemplates.length === 0 ? (
            <div className={styles.emptyState}>
              No templates match the selected category.
            </div>
          ) : (
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
                  onPreview={setPreviewId}
                />
              ))}
            </div>
          )}
        </>
      )}

      {previewId && (
        <TemplatePreviewModal
          templateId={previewId}
          data={previewData}
          onClose={() => setPreviewId(null)}
          actionLabel={resolvedTemplateId === previewId ? undefined : 'Apply template'}
          actionPending={applyMutation.isPending}
          onAction={() => {
            handleApply(previewId)
            setPreviewId(null)
          }}
        />
      )}
    </>
  )
}
