'use client'

/**
 * pdf-import-button.tsx — Upload a PDF resume and parse it into ResumeData.
 *
 * Renders a styled "Import from PDF" button. On click, opens a file picker
 * restricted to .pdf files. Uploads the selected file to POST /api/parse-resume,
 * shows a step-by-step progress card during parsing, and calls the parent's
 * onImport callback with the parsed ResumeData.
 *
 * Used by both the Profile page and the Resumes Dashboard page.
 */

import { useRef, useState, useCallback } from 'react'
import type { ResumeData } from '@/lib/types'
import styles from './pdf-import-button.module.css'

type ImportState = 'idle' | 'parsing' | 'success' | 'error'

// ── SVG Icons (Lucide-style, 14×14) ──────────────────────────────────────────

const IconFileText = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

const IconBrain = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a4 4 0 0 1 4 4 3.5 3.5 0 0 1 2.5 6 3.5 3.5 0 0 1-1 6.5A3 3 0 0 1 12 22" />
    <path d="M12 2a4 4 0 0 0-4 4 3.5 3.5 0 0 0-2.5 6 3.5 3.5 0 0 0 1 6.5A3 3 0 0 0 12 22" />
    <path d="M12 2v20" />
  </svg>
)

const IconLayoutGrid = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconAlertTriangle = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconCircleCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const IconRefresh = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const STEPS = [
  { label: 'Extracting text & hyperlinks from PDF', icon: <IconFileText /> },
  { label: 'AI is analyzing resume structure', icon: <IconBrain /> },
  { label: 'Mapping data to structured fields', icon: <IconLayoutGrid /> },
]

interface PdfImportButtonProps {
  /** Called with the parsed ResumeData on successful import. */
  onImport: (data: ResumeData) => void
  /** If true, the button is disabled (e.g. while save is in progress). */
  disabled?: boolean
  /** Optional label override. Default: "Import from PDF" */
  label?: string
}

export function PdfImportButton({
  onImport,
  disabled = false,
  label = 'Import from PDF',
}: PdfImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<ImportState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [lastFile, setLastFile] = useState<File | null>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const handleUpload = useCallback(
    async (file: File) => {
      setState('parsing')
      setCurrentStep(0)
      setErrorMsg('')
      setLastFile(file)

      try {
        const formData = new FormData()
        formData.append('file', file)

        // Progress through steps while the API call runs
        const timer1 = setTimeout(() => setCurrentStep(1), 1500)
        const timer2 = setTimeout(() => setCurrentStep(2), 8000)

        const res = await fetch('/api/parse-resume', {
          method: 'POST',
          body: formData,
        })

        clearTimeout(timer1)
        clearTimeout(timer2)

        if (res.status === 401) {
          window.location.href = '/login'
          return
        }

        const data = await res.json()

        if (!res.ok || !data.success) {
          setState('error')
          setErrorMsg(data.message || 'Failed to parse resume. Please try again.')
          return
        }

        setState('success')
        onImport(data.data as ResumeData)

        // Auto-clear success after 5s
        setTimeout(() => setState('idle'), 5000)
      } catch {
        setState('error')
        setErrorMsg('Network error. Please check your connection and try again.')
      }
    },
    [onImport]
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // Reset so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleRetry() {
    if (lastFile) {
      handleUpload(lastFile)
    }
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  const isDisabled = disabled || state === 'parsing'
  const progressPercent =
    currentStep === 0 ? 20 : currentStep === 1 ? 55 : 85

  return (
    <div className={styles.importWrapper}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className={styles.hiddenInput}
        onChange={handleFileChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Trigger button */}
      <button
        type="button"
        className={styles.importButton}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={label}
      >
        <span className={styles.importButtonIcon} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </span>
        {label}
      </button>

      {/* ── Parsing card with progress ─────────────────────────────────── */}
      {state === 'parsing' && (
        <div className={styles.parsingCard} role="status" aria-live="polite">
          <div className={styles.parsingCardHeader}>
            <span className={styles.parsingCardSpinner} aria-hidden="true" />
            <div>
              <div className={styles.parsingCardTitle}>Importing your resume</div>
              <div className={styles.parsingCardSubtitle}>
                Powered by AI — this takes 5–15 seconds
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className={styles.stepsContainer}>
            {STEPS.map((step, i) => {
              const isDone = i < currentStep
              const isActive = i === currentStep

              return (
                <div
                  key={i}
                  className={`${styles.step} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}
                >
                  <span
                    className={`${styles.stepIcon} ${
                      isDone
                        ? styles.stepIconDone
                        : isActive
                          ? styles.stepIconActive
                          : styles.stepIconPending
                    }`}
                    aria-hidden="true"
                  >
                    {isDone ? <IconCheck /> : step.icon}
                  </span>
                  {step.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {state === 'error' && (
        <div className={styles.errorBanner} role="alert">
          <span className={styles.errorIcon} aria-hidden="true"><IconAlertTriangle /></span>
          <div className={styles.errorBody}>
            <span className={styles.errorText}>{errorMsg}</span>
            <button
              type="button"
              className={styles.retryButton}
              onClick={handleRetry}
            >
              <IconRefresh /> Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Success banner ────────────────────────────────────────────── */}
      {state === 'success' && (
        <div className={styles.successBanner} role="status" aria-live="polite">
          <span className={styles.successIcon} aria-hidden="true"><IconCircleCheck /></span>
          <div className={styles.successBody}>
            <span className={styles.successTitle}>Resume imported successfully</span>
            <span className={styles.successHint}>
              Review the fields below and click Save when ready.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
