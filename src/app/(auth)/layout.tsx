import styles from './_components/auth-layout.module.css'

/**
 * AuthLayout — shared shell for the authentication route group.
 *
 * Centers the auth card vertically and horizontally on a full-height
 * background. The parentheses route group `(auth)` keeps these pages out
 * of the URL path while still sharing this layout. The `/auth/*` route
 * handlers are unaffected by this group.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <main className={styles.shell}>{children}</main>
}
