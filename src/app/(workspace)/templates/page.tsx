'use client'

/**
 * templates/page.tsx — global template gallery.
 *
 * Lets the user browse all predefined templates (lib/templates/registry) with a
 * live preview rendered from sample data, filter by category, and start a new
 * resume from any template (POST /api/resumes { templateId }).
 *
 * Requirements: 4.1, 4.2, 4.6, 4.7
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import type { Resume } from '@/lib/types'
import { TEMPLATES, type TemplateMeta } from '@/lib/templates/registry'
import { ResumeDocument } from '@/lib/templates/resume-document'
import { SAMPLE_RESUME } from '@/lib/templates/sample'
import { TemplatePreviewModal } from './_components/template-preview-modal'
import styles from '../_components/workspace-ui.module.css'

async function createResume(templateId: string): Promise<Resume> {
  const res = await fetch('/api/resumes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error('Failed to create resume')
  const data = await res.json()
  return data.resume as Resume
}

interface CardProps {
  template: TemplateMeta
  isStarting: boolean
  onUse: (id: string) => void
  onPreview: (id: string) => void
}

function TemplateCard({ template, isStarting, onUse, onPreview }: CardProps) {
  return (
    <div className={styles.templateCard} aria-label={`Template: ${template.name}`}>
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
          <button
            type="button"
            className={styles.templateCardApplyButton}
            disabled={isStarting}
            onClick={() => onUse(template.id)}
          >
            {isStarting ? 'Creating…' : 'Use this template'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ALL_CATEGORY = '__all__'

export default function TemplatesBrowsePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeCategory, setActiveCategory] = useState<string>(ALL_CATEGORY)
  const [error, setError] = useState<string | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)

  const categories = useMemo(() => {
    const seen = new Set<string>()
    for (const t of TEMPLATES) seen.add(t.roleCategory)
    return Array.from(seen).sort()
  }, [])

  const filtered = useMemo(() => {
    if (activeCategory === ALL_CATEGORY) return TEMPLATES
    return TEMPLATES.filter((t) => t.roleCategory === activeCategory)
  }, [activeCategory])

  const createMutation = useMutation({
    mutationFn: (templateId: string) => createResume(templateId),
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
      router.push(`/resumes/${resume.id}`)
    },
    onError: () => setError('Failed to create a resume from this template. Please try again.'),
  })

  function handleUse(templateId: string) {
    setError(null)
    createMutation.mutate(templateId)
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Templates</h1>
          <p className={styles.pageSubtitle}>
            Browse {TEMPLATES.length} designs and start a new resume from any of them.
          </p>
        </div>
      </div>

      {error && (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert" style={{ marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

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

      <div className={styles.galleryGrid}>
        {filtered.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isStarting={createMutation.isPending && createMutation.variables === template.id}
            onUse={handleUse}
            onPreview={setPreviewId}
          />
        ))}
      </div>

      {previewId && (
        <TemplatePreviewModal
          templateId={previewId}
          data={SAMPLE_RESUME}
          onClose={() => setPreviewId(null)}
          actionLabel="Use this template"
          actionPending={createMutation.isPending}
          onAction={() => handleUse(previewId)}
        />
      )}
    </>
  )
}
