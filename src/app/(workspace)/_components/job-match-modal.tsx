'use client'

/**
 * job-match-modal.tsx — paste a job description and score the resume against it.
 *
 * Calls POST /api/resumes/:id/match and renders a match report. Optionally
 * calls POST /api/resumes/:id/tailor to generate a tailored version of skills,
 * experience descriptions, and summary. Tailored changes are returned to the
 * parent for accept/discard — nothing is persisted automatically.
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

type TailoredResume = {
  skills: string[]
  experience: { title: string; organization: string; startDate: string; endDate: string | null; description: string }[]
  summary: string
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
  onTailor,
}: {
  resumeId: string
  resumeName: string
  onClose: () => void
  /** Called when the user accepts the tailored resume. Parent is responsible for applying + saving. */
  onTailor?: (tailored: TailoredResume) => void
}) {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<JobMatchResult | null>(null)
  const [tailoring, setTailoring] = useState(false)
  const [tailored, setTailored] = useState<TailoredResume | null>(null)
  const [tailorError, setTailorError] = useState<string | null>(null)

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
    setTailored(null)
    setTailorError(null)
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

  async function handleTailor() {
    setTailoring(true)
    setTailorError(null)
    try {
      const res = await fetch(`/api/resumes/${resumeId}/tailor`, {
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
        setTailorError(data.message ?? 'Failed to tailor resume.')
        return
      }
      setTailored(data.result as TailoredResume)
    } catch {
      setTailorError('Failed to tailor resume. Please try again.')
    } finally {
      setTailoring(false)
    }
  }

  function handleAcceptTailor() {
    if (tailored && onTailor) {
      onTailor(tailored)
      onClose()
    }
  }

  function handleDiscardTailor() {
    setTailored(null)
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
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg></div>
            <div>
              <h2 className={styles.title}>Job Match Score</h2>
              <p className={styles.subtitle}>{resumeName}</p>
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* ── Job description input ────────────────────────────────────── */}
        <label className={styles.inputLabel}>
          Job Description
          <span className={styles.inputHelper}>— paste the full posting below</span>
        </label>
        <textarea
          className={styles.textarea}
          placeholder="Paste the full job description here…"
          value={jobDescription}
          maxLength={MAX_CHARS}
          onChange={(e) => setJobDescription(e.target.value)}
          disabled={loading}
        />

        {/* ── Action row ───────────────────────────────────────────────── */}
        <div className={styles.actionRow}>
          <button type="button" className={styles.analyzeBtn} onClick={analyze} disabled={loading}>
            {loading ? (
              <>
                <span className={styles.spinner} />
                Analyzing…
              </>
            ) : (
              <>
                <span className={styles.analyzeBtnIcon}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>
                {result ? 'Re-analyze' : 'Analyze match'}
              </>
            )}
          </button>
          <span className={styles.charCount}>
            {jobDescription.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────────────── */}
        {result && (
          <div className={styles.result}>
            <hr className={styles.divider} />

            {/* Score card */}
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

            {/* Matched keywords */}
            {result.matchedKeywords.length > 0 && (
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={`${styles.blockIcon} ${styles.blockIconMatched}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                  <span className={styles.blockTitle}>Matched Keywords</span>
                </div>
                <div className={styles.chips}>
                  {result.matchedKeywords.map((k, i) => (
                    <span key={i} className={`${styles.chip} ${styles.chipMatched}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Missing keywords */}
            {result.missingKeywords.length > 0 && (
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={`${styles.blockIcon} ${styles.blockIconMissing}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
                  <span className={styles.blockTitle}>Missing Keywords</span>
                </div>
                <div className={styles.chips}>
                  {result.missingKeywords.map((k, i) => (
                    <span key={i} className={`${styles.chip} ${styles.chipMissing}`}>
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Gaps */}
            {(result.strengths.length > 0 || result.gaps.length > 0) && (
              <div className={styles.columns}>
                {result.strengths.length > 0 && (
                  <div className={styles.block}>
                    <div className={styles.blockHeader}>
                      <span className={`${styles.blockIcon} ${styles.blockIconStrength}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg></span>
                      <span className={styles.blockTitle}>Strengths</span>
                    </div>
                    <ul className={styles.bullets}>
                      {result.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.gaps.length > 0 && (
                  <div className={styles.block}>
                    <div className={styles.blockHeader}>
                      <span className={`${styles.blockIcon} ${styles.blockIconGap}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span>
                      <span className={styles.blockTitle}>Gaps</span>
                    </div>
                    <ul className={styles.bullets}>
                      {result.gaps.map((g, i) => (
                        <li key={i}>{g}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Suggestions */}
            {result.suggestions.length > 0 && (
              <div className={styles.block}>
                <div className={styles.blockHeader}>
                  <span className={`${styles.blockIcon} ${styles.blockIconSuggestion}`}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg></span>
                  <span className={styles.blockTitle}>Suggestions to Improve Your Match</span>
                </div>
                <ul className={styles.bullets}>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Tailor ───────────────────────────────────────────────── */}
            {onTailor && (
              <div className={styles.tailorSection}>
                <hr className={styles.divider} />
                {!tailored ? (
                  <div className={styles.tailorPrompt}>
                    <div>
                      <span className={styles.blockTitle}>Auto-tailor your resume</span>
                      <p className={styles.tailorDesc}>
                        AI will add relevant skills, rewrite experience descriptions, and
                        update your summary to match this job. You can review changes before saving.
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.tailorBtn}
                      onClick={handleTailor}
                      disabled={tailoring}
                    >
                      {tailoring ? (
                        <><span className={styles.spinner} /> Tailoring…</>
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9.94 2.5 12 7l5.06 2.07-5.06 2.06L9.94 17l-2.07-5.13L2 9.07 7.87 7z" />
                            <path d="M16.8 15.1 18 18l3 1.2L18 20.4l-1.2 2.9-1.2-2.9L12.6 19.2l3-1.2z" />
                          </svg>
                          Tailor resume
                        </>
                      )}
                    </button>
                    {tailorError && <p className={styles.error}>{tailorError}</p>}
                  </div>
                ) : (
                  <div className={styles.tailorResult}>
                    <span className={styles.blockTitle}>Tailored resume ready</span>
                    <p className={styles.tailorDesc}>
                      Skills, experience descriptions, and summary have been rewritten
                      to align with this job. Review the changes below.
                    </p>

                    <div className={styles.tailorPreview}>
                      <div className={styles.tailorPreviewBlock}>
                        <span className={styles.tailorPreviewLabel}>Summary</span>
                        <p className={styles.tailorPreviewText}>{tailored.summary}</p>
                      </div>

                      <div className={styles.tailorPreviewBlock}>
                        <span className={styles.tailorPreviewLabel}>Skills ({tailored.skills.length})</span>
                        <div className={styles.chips}>
                          {tailored.skills.map((s, i) => (
                            <span key={i} className={`${styles.chip} ${styles.chipMatched}`}>{s}</span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.tailorPreviewBlock}>
                        <span className={styles.tailorPreviewLabel}>Experience ({tailored.experience.length} entries)</span>
                        {tailored.experience.map((e, i) => (
                          <div key={i} className={styles.tailorExpEntry}>
                            <strong>{e.title}</strong> · {e.organization}
                            <p className={styles.tailorPreviewText}>{e.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={styles.tailorActions}>
                      <button type="button" className={styles.analyzeBtn} onClick={handleAcceptTailor}>
                        Accept &amp; apply
                      </button>
                      <button type="button" className={styles.tailorDiscardBtn} onClick={handleDiscardTailor}>
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
