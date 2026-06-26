'use client'

/**
 * WorkspaceLayout — shell with integrated navigation.
 *
 * The navbar sits flush with the page background (no border, no blur card).
 * Theme toggle and sign-out live in a compact dropdown accessed via a user
 * avatar button so they stay out of the main nav bar.
 *
 * Requirements: 5.1, 11.1
 */

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { BrandLogo } from '@/components/brand-logo'
import { ToastContainer } from './_components/toast'
import { ThemeToggle } from './_components/theme-toggle'
import { ConfirmModal } from './_components/confirm-modal'
import styles from './_components/workspace-ui.module.css'

// ── User menu dropdown ────────────────────────────────────────────────────────

function LogOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function UserMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  )
}

function UserMenu({ onSignOutRequest }: { onSignOutRequest: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div className={styles.userMenu} ref={ref}>
      <button
        type="button"
        className={styles.userMenuTrigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open user menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserMenuIcon />
      </button>

      {open && (
        <div className={styles.userMenuDropdown} role="menu">
          <ThemeToggle asMenuItem />
          <div className={styles.userMenuDivider} />
          <button
            type="button"
            className={styles.userMenuItem}
            role="menuitem"
            onClick={() => { setOpen(false); onSignOutRequest() }}
          >
            <LogOutIcon />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/resumes" className={styles.navBrand}>
          <span className={styles.navBrandMark}>
            <BrandLogo size={20} />
          </span>
          Resumify
        </Link>

        <div className={styles.navLinks}>
          <Link
            href="/resumes"
            className={`${styles.navLink} ${isActive('/resumes') ? styles.navLinkActive : ''}`}
          >
            Dashboard
          </Link>
          <Link
            href="/templates"
            className={`${styles.navLink} ${isActive('/templates') ? styles.navLinkActive : ''}`}
          >
            Templates
          </Link>
          <Link
            href="/profile"
            className={`${styles.navLink} ${isActive('/profile') ? styles.navLinkActive : ''}`}
          >
            Profile
          </Link>
        </div>

        <div className={styles.navActions}>
          <UserMenu onSignOutRequest={() => setConfirmSignOut(true)} />
        </div>
      </nav>

      <main className={styles.main}>
        {children}
      </main>

      <ToastContainer />

      {confirmSignOut && (
        <ConfirmModal
          title="Sign out?"
          body="You'll be returned to the login page."
          confirmLabel="Sign out"
          variant="primary"
          isPending={signingOut}
          onConfirm={handleSignOut}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  )
}
