import styles from './_components/auth-layout.module.css'
import { ExitDemo } from './_components/exit-demo'

/**
 * AuthLayout — shared shell for the authentication route group.
 *
 * Split-screen layout: a branded gradient panel (hidden on small screens)
 * beside an open form area. The form pages render directly on the surface
 * with no card box. The parentheses route group `(auth)` keeps these pages
 * out of the URL path while still sharing this layout. The `/auth/*` route
 * handlers are unaffected by this group.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={styles.shell}>
      <ExitDemo />
      <aside className={styles.brand} aria-hidden="true">
        <div className={styles.brandInner}>
          <span className={styles.brandMark}>Resumify</span>
          <p className={styles.brandTagline}>
            Build a professional resume with AI — in minutes, not hours.
          </p>
        </div>
      </aside>
      <main className={styles.content}>
        <div className={styles.contentInner}>{children}</div>
      </main>
    </div>
  )
}
