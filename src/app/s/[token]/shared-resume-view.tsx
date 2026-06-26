'use client'

/**
 * shared-resume-view.tsx — public recruiter view of a resume.
 *
 * Renders the resume in its selected template with a polished, branded frame.
 * Download produces a clean server-generated PDF (clickable links, no chrome)
 * via /api/share-pdf/:token. No app chrome, no auth — this is a public page.
 */

import type { ResumeData } from '@/lib/types'
import { ResumeDocument } from '@/lib/templates/resume-document'
import { BrandLogo } from '@/components/brand-logo'
import styles from './shared-resume-view.module.css'

const IconDownload = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

export function SharedResumeView({
  token,
  templateId,
  data,
}: {
  token: string
  templateId: string | null
  data: ResumeData
}) {
  const name = data.fullName || 'Resume'

  return (
    <div className={styles.wrap}>
      <header className={styles.toolbar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}><BrandLogo size={26} /></span>
          <div className={styles.brandText}>
            <span className={styles.brandName}>{name}</span>
            <span className={styles.brandSub}>Shared résumé</span>
          </div>
        </div>

        <a
          className={styles.downloadBtn}
          href={`/api/share-pdf/${token}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <IconDownload />
          <span>Download PDF</span>
        </a>
      </header>

      <main className={styles.stage}>
        <div className={styles.paper}>
          <ResumeDocument templateId={templateId} data={data} />
        </div>
      </main>

      <footer className={styles.footer}>
        <span>Made with</span>
        <a href="/" className={styles.footerLink}>Resumify</a>
        <span className={styles.footerDot}>·</span>
        <a href="/" className={styles.footerLink}>Create your own resume free</a>
      </footer>
    </div>
  )
}
