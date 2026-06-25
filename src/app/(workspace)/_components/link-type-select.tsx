'use client'

/**
 * link-type-select.tsx — custom icon-driven dropdown for picking a link type.
 *
 * Replaces the native <select> with a fully accessible, nicely styled picker.
 * The trigger button shows the icon + label of the current selection.
 * The panel shows all options with their icons. Closes on outside click / Escape.
 */

import { useEffect, useRef, useState } from 'react'
import type { LinkType } from '@/lib/types'
import { LinkIcon } from '@/lib/templates/icons'
import styles from './link-type-select.module.css'

const LINK_OPTIONS: { value: LinkType; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'github', label: 'GitHub' },
  { value: 'leetcode', label: 'LeetCode' },
  { value: 'website', label: 'Website' },
  { value: 'twitter', label: 'X / Twitter' },
  { value: 'dribbble', label: 'Dribbble' },
  { value: 'medium', label: 'Medium' },
  { value: 'other', label: 'Other link' },
]

interface Props {
  value: LinkType
  onChange: (value: LinkType) => void
  label: string
}

export function LinkTypeSelect({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = LINK_OPTIONS.find((o) => o.value === value) ?? LINK_OPTIONS[0]

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape, navigate with arrow keys
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const idx = LINK_OPTIONS.findIndex((o) => o.value === value)
        const next =
          e.key === 'ArrowDown'
            ? (idx + 1) % LINK_OPTIONS.length
            : (idx - 1 + LINK_OPTIONS.length) % LINK_OPTIONS.length
        onChange(LINK_OPTIONS[next].value)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, value, onChange])

  return (
    <div className={styles.root} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span className={styles.triggerIcon}>
          <LinkIcon type={selected.value} size={14} />
        </span>
        <span className={styles.triggerLabel}>{selected.label}</span>
        <span className={styles.triggerChevron} aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
          </svg>
        </span>
      </button>

      {open && (
        <ul
          className={styles.panel}
          role="listbox"
          aria-label={label}
        >
          {LINK_OPTIONS.map((opt) => {
            const isSelected = opt.value === value
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onChange(opt.value)
                    setOpen(false)
                  }
                }}
                tabIndex={0}
              >
                <span className={styles.optionIcon}>
                  <LinkIcon type={opt.value} size={14} />
                </span>
                <span className={styles.optionLabel}>{opt.label}</span>
                {isSelected && (
                  <span className={styles.optionCheck} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
