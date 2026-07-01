'use client'

/**
 * resumes/[id]/preview/page.tsx — rendered resume preview + PDF download.
 *
 * Loads the resume, renders it with the selected predefined template, and lets
 * the user download a PDF via the browser's native print-to-PDF (no LaTeX, no
 * compile service). A template switcher lets the user preview other styles
 * before downloading; selecting one persists it via PUT /api/resumes/:id/template.
 */

import { use, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/components/query-provider'
import type { Resume, ResumeData } from '@/lib/types'
import { TEMPLATES, getTemplateMeta } from '@/lib/templates/registry'
import { ResumeDocument } from '@/lib/templates/resume-document'
import { isDemoMode } from '@/lib/demo/demo-mode'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dropdownOpen])

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
  const activeMeta = getTemplateMeta(activeTemplateId)

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
    setDropdownOpen(false)
    applyMutation.mutate(templateId)
  }

  return (
    <>
      <div className={styles.noPrint}>
        <Link href={`/resumes/${id}`} className={workspace.backLink}>
          ← Back to editor
        </Link>

        <div className={styles.toolbar}>
          <label className={workspace.label}>Template</label>
          <div className={styles.templatePicker} ref={dropdownRef}>
            <button
              type="button"
              className={styles.templateTrigger}
              onClick={() => setDropdownOpen((v) => !v)}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
            >
              <span className={styles.templateTriggerSwatch} style={{ background: activeMeta.accent }} />
              {activeMeta.name}
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                className={`${styles.templateTriggerChevron} ${dropdownOpen ? styles.templateTriggerChevronOpen : ''}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {dropdownOpen && (
              <ul className={styles.templateDropdown} role="listbox">
                {TEMPLATES.map((t) => (
                  <li key={t.id} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={t.id === activeTemplateId}
                      className={`${styles.templateOption} ${t.id === activeTemplateId ? styles.templateOptionActive : ''}`}
                      onClick={() => handleSelect(t.id)}
                    >
                      <span className={styles.templateOptionSwatch} style={{ background: t.accent }} />
                      {t.name}
                      <span className={styles.templateOptionCategory}>{t.roleCategory}</span>
                      {t.id === activeTemplateId && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.templateOptionCheck}>
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <span className={styles.spacer} />

          <button
            type="button"
            className={workspace.button}
            onClick={async () => {
              if (isDemoMode()) {
                // Demo: no server-side resume, so POST the locally-stored data
                // and download the generated PDF blob.
                try {
                  const res = await fetch(`/api/resumes/${id}/pdf`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-demo-mode': '1' },
                    body: JSON.stringify({ data, templateId: activeTemplateId }),
                  })
                  if (!res.ok) throw new Error('Failed to generate PDF')
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${(resume.fullName || 'resume').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`
                  document.body.appendChild(a)
                  a.click()
                  a.remove()
                  URL.revokeObjectURL(url)
                } catch {
                  // Fall back to browser print if PDF generation fails.
                  window.print()
                }
              } else {
                window.open(`/api/resumes/${id}/pdf`, '_blank', 'noopener,noreferrer')
              }
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
