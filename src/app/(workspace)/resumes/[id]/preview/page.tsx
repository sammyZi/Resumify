'use client'

/**
 * resumes/[id]/preview/page.tsx — rendered resume preview + PDF download.
 *
 * Loads the resume, renders it with the selected predefined template, and lets
 * the user download a PDF via the browser's native print-to-PDF (no LaTeX, no
 * compile service). A template switcher lets the user preview other styles
 * before downloading; selecting one persists it via PUT /api/resumes/:id/template.
 */

import { use, useState } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import type { Resume, ResumeData } from '@/lib/types'
import { TEMPLATES, getTemplateMeta } from '@/lib/templates/registry'
import { ResumeDocument } from '@/lib/templates/resume-document'
import workspace from '../../../_components/workspace-ui.module.css'
import styles from './preview.module.css'

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

async function applyTemplate(resumeId: string, templateId: string): Promise<boolean> {
  const res = await fetch(`/api/resumes/${resumeId}/template`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId }),
  })
  if (res.status === 401) {
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  const data = await res.json().catch(() => ({}))
  return res.ok && data.success === true
}

export default function ResumePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const queryClient = useQueryClient()

  const { data: resume, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.resume(id),
    queryFn: () => fetchResume(id),
  })

  // Local override so switching templates updates the preview instantly while
  // the persistence request is in flight.
  const [selected, setSelected] = useState<string | null>(null)

  const applyMutation = useMutation({
    mutationFn: (templateId: string) => applyTemplate(id, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resume(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes() })
    },
  })

  if (isLoading) {
    return <p className={workspace.loading}>Loading preview…</p>
  }

  if (isError || !resume) {
    const msg = error instanceof Error ? error.message : 'Failed to load resume'
    return (
      <>
        <Link href={`/resumes/${id}`} className={workspace.backLink}>
          ← Back to editor
        </Link>
        <div className={`${workspace.notice} ${workspace.noticeError}`} role="alert">
          {msg}
        </div>
      </>
    )
  }

  const activeTemplateId = selected ?? resume.templateId ?? getTemplateMeta(null).id

  const data: ResumeData = {
    fullName: resume.fullName,
    email: resume.email,
    phone: resume.phone,
    location: resume.location,
    summary: resume.summary,
    links: resume.links,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    skills: resume.skills,
    achievements: resume.achievements,
  }

  function handleSelect(templateId: string) {
    setSelected(templateId)
    applyMutation.mutate(templateId)
  }

  return (
    <>
      <div className={styles.noPrint}>
        <Link href={`/resumes/${id}`} className={workspace.backLink}>
          ← Back to editor
        </Link>

        <div className={styles.toolbar}>
          <label className={workspace.label} htmlFor="template-select">
            Template
          </label>
          <select
            id="template-select"
            className={workspace.input}
            style={{ width: 'auto' }}
            value={activeTemplateId}
            onChange={(e) => handleSelect(e.target.value)}
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} — {t.roleCategory}
              </option>
            ))}
          </select>

          <span className={styles.spacer} />

          <button
            type="button"
            className={workspace.button}
            onClick={() => {
              window.open(`/api/resumes/${id}/pdf`, '_blank', 'noopener,noreferrer')
            }}
          >
            Download PDF
          </button>
        </div>

        <p
          className={`${workspace.notice} ${workspace.noticeInfo}`}
          style={{ marginBottom: '1rem' }}
        >
          Tip: the PDF will download with clickable links and clean formatting.
        </p>
      </div>

      <div className={styles.stage}>
        <div className={styles.paper}>
          <ResumeDocument templateId={activeTemplateId} data={data} />
        </div>
      </div>
    </>
  )
}
