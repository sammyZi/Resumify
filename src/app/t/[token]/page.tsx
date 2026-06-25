/**
 * page.tsx — GET /t/:token (Template copy landing page)
 *
 * Next.js Server Component. Resolves the share token, then:
 *  - If the share is invalid/revoked/wrong kind: renders "Link unavailable."
 *  - If the visitor is unauthenticated: redirects to /auth/login?redirect=/t/{token}.
 *  - If the visitor is authenticated: copies the template into their account and
 *    redirects to the new resume's workspace page.
 *
 * redirect() is called outside try/catch per Next.js docs.
 *
 * Requirements: 8.4, 8.5, 8.6, 10.3, 10.4, 10.5
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { resolveShare, copyTemplateFromShare } from '@/lib/services/share-service'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function TemplateCopyPage({ params }: PageProps) {
  const { token } = await params

  // 1. Resolve the share — uses service-role client, no session needed.
  const resolved = await resolveShare(token)

  if (!resolved.ok || resolved.value.share.kind !== 'template') {
    return <LinkUnavailable />
  }

  // 2. Check whether the visitor is authenticated (session-bound client).
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 3. Unauthenticated: redirect to login with a return URL.
  //    redirect() must be called outside try/catch — it throws NEXT_REDIRECT.
  if (!user) {
    redirect(`/auth/login?redirect=/t/${token}`)
  }

  // 4. Authenticated: copy the template into the user's account.
  const copyResult = await copyTemplateFromShare(token, user.id)

  if (!copyResult.ok) {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Something went wrong</h1>
        <p style={styles.body}>
          {copyResult.error.message ||
            'Failed to copy the template. Please try again.'}
        </p>
        <a href={`/t/${token}`} style={styles.retryLink}>
          Try again
        </a>
      </main>
    )
  }

  const newResume = copyResult.value

  // 5. Success: redirect to the new resume's workspace page.
  redirect(`/resumes/${newResume.id}`)
}

// ─── Link Unavailable component ───────────────────────────────────────────────

function LinkUnavailable() {
  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Link unavailable</h1>
      <p style={styles.body}>
        This template share link has been revoked or does not exist. Please ask
        the sender for an updated link.
      </p>
    </main>
  )
}

// ─── Minimal inline styles ────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: '640px',
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: 'Rubik, system-ui, sans-serif',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: 'var(--color-text-primary, #1a1a1a)',
  },
  body: {
    fontSize: '1rem',
    color: 'var(--color-text-secondary, #555)',
    marginBottom: '1.5rem',
  },
  retryLink: {
    display: 'inline-block',
    padding: '0.625rem 1.25rem',
    backgroundColor: 'var(--color-primary, #1a1a1a)',
    color: 'var(--color-primary-text, #fff)',
    textDecoration: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
} as const
