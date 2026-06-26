'use client'

/**
 * card-menu.tsx — three-dot context menu for dashboard resume cards.
 *
 * Items: Share (recruiter link), Rename, Delete.
 * Closes on outside click, Escape, or selecting an item.
 */

import { useEffect, useRef, useState } from 'react'
import styles from './card-menu.module.css'

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

interface Props {
  resumeName: string
  onShare: () => void
  onRename: () => void
  onDelete: () => void
  isSharing?: boolean
}

export function CardMenu({ resumeName, onShare, onRename, onDelete, isSharing }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function click(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', click)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', click)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  function handle(e: React.MouseEvent, fn: () => void) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(false)
    fn()
  }

  function openMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setOpen((v) => !v)
  }

  return (
    <div className={styles.root} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={openMenu}
        aria-label={`Options for ${resumeName}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <DotsIcon />
      </button>

      {open && (
        <ul className={styles.menu} role="menu">
          <li role="none">
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={(e) => handle(e, onShare)}
              disabled={isSharing}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {isSharing ? 'Sharing…' : 'Share'}
            </button>
          </li>
          <li role="none">
            <button
              type="button"
              className={styles.item}
              role="menuitem"
              onClick={(e) => handle(e, onRename)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Rename
            </button>
          </li>
          <li role="none">
            <div className={styles.divider} />
          </li>
          <li role="none">
            <button
              type="button"
              className={`${styles.item} ${styles.itemDanger}`}
              role="menuitem"
              onClick={(e) => handle(e, onDelete)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Delete
            </button>
          </li>
        </ul>
      )}
    </div>
  )
}
