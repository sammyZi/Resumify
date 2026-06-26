'use client'

/**
 * share-modal.tsx — manage share links for a resume.
 *
 * Lists existing (non-revoked) shares, lets the user create new recruiter or
 * template links, copy them, and revoke them.
 */

import { useEffect, useState, useCallback } from 'react'
import type { Share } from '@/lib/types'
import styles from './share-modal.module.css'

type ShareKind = 'recruiter' | 'template'

function buildUrl(token: string, kind: ShareKind) {
  return kind === 'recruiter'
    ? `${window.location.origin}/s/${token}`
    : `${window.location.origin}/t/${token}`
}

export function ShareModal({
  resumeId,
  resumeName,
  onClose,
}: {
  resumeId: string
  resumeName: string
  onClose: () => void
}) {
  const [shares, setShares] = useState<Share[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState<ShareKind | null>(null)
  const [revoking, setRevoking] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/shares?resumeId=${resumeId}`, { cache: 'no-store' })
      if (res.status === 401) { window.location.href = '/login'; return }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Failed to load share links.')
        setShares([])
      } else {
        setShares((data.shares as Share[]) ?? [])
      }
    } catch {
      setError('Failed to load share links.')
    } finally {
      setLoading(false)
    }
  }, [resumeId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  async function createShare(kind: ShareKind) {
    setCreating(kind)
    setError(null)
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId, kind }),
      })
      if (!res.ok) throw new Error()
      await load()
    } catch {
      setError('Failed to create share link.')
    } finally {
      setCreating(null)
    }
  }

  async function revoke(id: string) {
    setRevoking(id)
    setConfirmingId(null)
    try {
      const res = await fetch(`/api/shares/${id}/revoke`, { method: 'POST' })
      if (!res.ok) throw new Error()
      setShares((prev) => prev.filter((s) => s.id !== id))
    } catch {
      setError('Failed to revoke link.')
    } finally {
      setRevoking(null)
    }
  }

  async function copy(share: Share) {
    const url = buildUrl(share.token, share.kind)
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(share.id)
      setTimeout(() => setCopiedId((c) => (c === share.id ? null : c)), 1800)
    } catch { /* ignore */ }
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Share resume" onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Share</h2>
            <p className={styles.subtitle}>{resumeName}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className={styles.createRow}>
          <button type="button" className={styles.createBtn} onClick={() => createShare('recruiter')} disabled={creating !== null}>
            {creating === 'recruiter' ? 'Creating…' : '+ Recruiter link'}
          </button>
          <button type="button" className={`${styles.createBtn} ${styles.createBtnAlt}`} onClick={() => createShare('template')} disabled={creating !== null}>
            {creating === 'template' ? 'Creating…' : '+ Template link'}
          </button>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : shares.length === 0 ? (
            <p className={styles.empty}>No active share links yet. Create one above.</p>
          ) : (
            shares.map((share) => {
              const url = buildUrl(share.token, share.kind)
              return (
                <div key={share.id} className={styles.item}>
                  <span className={`${styles.kind} ${share.kind === 'recruiter' ? styles.kindRec : styles.kindTpl}`}>
                    {share.kind === 'recruiter' ? 'Recruiter' : 'Template'}
                  </span>
                  <span className={styles.url} title={url}>{url}</span>
                  <div className={styles.actions}>
                    <button type="button" className={styles.copyBtn} onClick={() => copy(share)}>
                      {copiedId === share.id ? 'Copied!' : 'Copy'}
                    </button>
                    {confirmingId === share.id ? (
                      <>
                        <button
                          type="button"
                          className={styles.revokeBtn}
                          onClick={() => revoke(share.id)}
                          disabled={revoking === share.id}
                        >
                          {revoking === share.id ? '…' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          className={styles.copyBtn}
                          onClick={() => setConfirmingId(null)}
                          disabled={revoking === share.id}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.revokeBtn}
                        onClick={() => setConfirmingId(share.id)}
                        disabled={revoking === share.id}
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
