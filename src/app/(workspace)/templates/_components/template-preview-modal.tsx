'use client'

/**
 * template-preview-modal.tsx — full-size template preview overlay.
 *
 * Renders the chosen template at near full size with the provided data and an
 * optional primary action (e.g. "Use this template" or "Apply"). Closes on the
 * backdrop, the ✕ button, or the Escape key.
 */

import { useEffect } from 'react'
import type { ResumeData } from '@/lib/types'
import { getTemplateMeta } from '@/lib/templates/registry'
import { ResumeDocument } from '@/lib/templates/resume-document'
import styles from './template-preview-modal.module.css'

interface Props {
  templateId: string
  data: ResumeData
  onClose: () => void
  actionLabel?: string
  onAction?: () => void
  actionPending?: boolean
}

export function TemplatePreviewModal({
  templateId,
  data,
  onClose,
  actionLabel,
  onAction,
  actionPending,
}: Props) {
  const meta = getTemplateMeta(templateId)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // Lock background scroll while the modal is open.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={`${meta.name} template preview`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.toolbar}>
          <div className={styles.headerLeft}>
            <span className={styles.accentDot} style={{ background: meta.accent }} />
            <div className={styles.headerInfo}>
              <div className={styles.title}>{meta.name}</div>
              <div className={styles.subtitle}>
                {meta.roleCategory}
                <span className={styles.description}> — {meta.description}</span>
              </div>
            </div>
          </div>
          <div className={styles.toolbarActions}>
            {actionLabel && onAction && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={onAction}
                disabled={actionPending}
              >
                {actionPending ? (
                  'Applying…'
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    {actionLabel}
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              className={styles.closeButton}
              onClick={onClose}
              aria-label="Close preview"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.paper}>
            <ResumeDocument templateId={templateId} data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
