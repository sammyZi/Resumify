'use client'

/**
 * shared-resume-view.tsx — public recruiter view of a resume.
 *
 * Renders the resume in its selected template and offers a print-to-PDF
 * download. No app chrome, no auth — this is a public page.
 */

import type { ResumeData } from '@/lib/types'
import { ResumeDocument } from '@/lib/templates/resume-document'
import styles from './shared-resume-view.module.css'

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export function SharedResumeView({
  templateId,
  data,
}: {
  templateId: string | null
  data: ResumeData
}) {
  return (
    <div className={styles.wrap}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon} aria-hidden="true">R</span>
          <span>Shared Resume</span>
        </div>
        <button
          type="button"
          className={styles.downloadBtn}
          onClick={() => window.print()}
        >
          <IconDownload />
          <span>Download PDF</span>
        </button>
      </header>

      <main className={styles.stage}>
        <div className={styles.paper}>
          <ResumeDocument templateId={templateId} data={data} />
        </div>
      </main>
    </div>
  )
}
