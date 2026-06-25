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

export function SharedResumeView({
  templateId,
  data,
}: {
  templateId: string | null
  data: ResumeData
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <span className={styles.brand}>
          {data.fullName ? `${data.fullName}'s résumé` : 'Résumé'}
        </span>
        <button type="button" className={styles.downloadBtn} onClick={() => window.print()}>
          Download PDF
        </button>
      </div>

      <div className={styles.stage}>
        <div className={styles.paper}>
          <ResumeDocument templateId={templateId} data={data} />
        </div>
      </div>
    </div>
  )
}
