'use client'

/**
 * job-match-modal.tsx — paste a job description and score the resume against it.
 *
 * Calls POST /api/resumes/:id/match and renders a match report: an overall
 * score, an estimated chance of selection, matched/missing keywords, strengths,
 * gaps, and actionable suggestions. Read-only — nothing is persisted.
 */

import { useEffect, useState } from 'react'
import styles from './job-match-modal.module.css'

type SelectionChance = 'Low' | 'Moderate' | 'High' | 'Very High'

type JobMatchResult = {
  matchScore: number
  selectionChance: SelectionChance
  summary: string
  matchedKeywords: string[]
  missingKeywords: string[]
  strengths: string[]
  gaps: string[]
  suggestions: string[]
}

const MAX_CHARS = 12000

const chanceClass: Record<SelectionChance, string> = {
  Low: styles.chanceLow,
  Moderate: styles.chanceModerate,
  High: styles.chanceHigh,
  'Very High': styles.chanceVeryHigh,
}

const ringColor: Record<SelectionChance, string> = {
  Low: '#dc2626',
  Moderate: '#d97706',
  High: '#059669',
  'Very High': '#047857',
}

export function JobMatchModal({
  resumeId,
  resumeName,
  onClose,
}: {
  resumeId: string
  resumeName: string
  onClose: () => void
}) {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<JobMatchResult | null>(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function analyze() {
    if (jobDescription.trim().length < 20) {
      setError('Please paste a longer job description to analyze.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/resumes/${resumeId}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription }),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message ?? 'Failed to analyze. Please try again.')
        return
      }
      setResult(data.result as JobMatchResult)
    } catch {
      setError('Failed to analyze. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Match resume to job description"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Job match score</h2>
            <p className={styles.subtitle}>{resumeName}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <textarea
          className={styles.textarea}
          placeholder="Paste the full job description here…"
          value={jobDescription}
          maxLength={MAX_CHARS}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={loading}
        />

        <div className={styles.actionRow}>
          <button type="button" className={styles.analyzeBtn} onClick={analyze} disabled={loading}>
            {loading ? 'Analyzing…' : result ? 'Re-analyze' : 'Analyze match'}
          </button>
          <span className={styles.charCount}>
            {jobDescription.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {result && (
          <div className={styles.result}>
            <div className={styles.scoreCard}>
              <div
                className={styles.ring}
                style={
                  {
                    '--pct': result.matchScore,
                    '--ring-color': ringColor[result.selectionChance],
                  } as React.CSSProperties
                }
                role="img"
                aria-label={`Match score ${result.matchScore} out of 100`}
              >
                <div className={styles.ringInner}>{result.matchScore}</div>
              </div>
              <div className={styles.scoreMeta}>
                <div className={styles.chanceLabel}>Chance of selection</div>
                <div className={`${styles.chanceValue} ${chanceClass[result.selectionChance]}`}>
                  {result.selectionChance}
                </div>
                {result.summary && <p className={styles.summary}>{result.summary}</p>}
              </div>
            </div>

            {result.matchedKeywords.length > 0 && (
              <div className={styles.block}>
                <span className={styles.blockTitle}>Matched keywords</span>
                <div className={styles.chips}>
                  {result.matchedKeywords.map((k, i) => (
                    <span key={i} className={`${styles.chip} ${styles.chipMatched}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.missingKeywords.length > 0 && (
              <div className={styles.block}>
                <span className={styles.blockTitle}>Missing keywords</span>
                <div className={styles.chips}>
                  {result.missingKeywords.map((k, i) => (
                    <span key={i} className={`${styles.chip} ${styles.chipMissing}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(result.strengths.length > 0 || result.gaps.length > 0) && (
              <div className={styles.columns}>
                {result.strengths.length > 0 && (
                  <div className={styles.block}>
                    <span className={styles.blockTitle}>Strengths</span>
                    <ul className={styles.bullets}>
                      {result.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.gaps.length > 0 && (
                  <div className={styles.block}>
                    <span className={styles.blockTitle}>Gaps</span>
                    <ul className={styles.bullets}>
                      {result.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {result.suggestions.length > 0 && (
              <div className={styles.block}>
                <span className={styles.blockTitle}>Suggestions to improve your match</span>
                <ul className={styles.bullets}>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
