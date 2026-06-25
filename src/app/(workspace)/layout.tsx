'use client'

/**
 * WorkspaceLayout — shell with navigation for authenticated workspace pages.
 *
 * Provides links to Dashboard, Templates and Profile, an animated theme toggle,
 * and a sign-out action. Client component so it can call the browser Supabase
 * client.
 *
 * Requirements: 5.1, 11.1
 */

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'
import { ToastContainer } from './_components/toast'
import { ThemeToggle } from './_components/theme-toggle'
import styles from './_components/workspace-ui.module.css'

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
          <ThemeToggle />
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
