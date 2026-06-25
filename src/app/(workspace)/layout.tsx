'use client'

/**
 * WorkspaceLayout — shell with navigation for authenticated workspace pages.
 *
 * Provides links to Dashboard, Templates and Profile, a theme toggle, and a
 * sign-out action. Client component so it can read the Zustand theme store and
 * call the browser Supabase client.
 *
 * Requirements: 5.1, 11.1
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useThemeStore } from '@/lib/stores/theme-store'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { ToastContainer } from './_components/toast'
import styles from './_components/workspace-ui.module.css'

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function LogOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggleTheme } = useThemeStore()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  return (
    <div className={styles.shell}>
      <nav className={styles.nav} aria-label="Main navigation">
        <Link href="/resumes" className={styles.navBrand}>
          <Image
            src="/icon.svg"
            alt=""
            width={28}
            height={28}
            className={styles.navBrandMark}
            priority
          />
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
          <button
            type="button"
            className={styles.themeButton}
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
          </button>
          <button
            type="button"
            className={styles.signOutButton}
            onClick={handleSignOut}
          >
            <LogOutIcon />
            <span className={styles.signOutLabel}>Sign out</span>
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        {children}
      </main>

      <ToastContainer />
    </div>
  )
}
