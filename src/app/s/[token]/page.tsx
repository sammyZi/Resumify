/**
 * page.tsx — GET /s/:token (Recruiter share page)
 *
 * Next.js Server Component. Resolves the share token server-side using the
 * service-role client (no user session required). Renders the resume in its
 * selected template for viewing and print-to-PDF download, or a
 * "link unavailable" message if the share is revoked, missing, or wrong kind.
 *
 * Requirements: 8.3, 8.6, 10.3, 10.4, 10.5
 */

import { resolveShare } from '@/lib/services/share-service'
import { SharedResumeView } from './shared-resume-view'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function RecruiterSharePage({ params }: PageProps) {
  const { token } = await params

  const resolved = await resolveShare(token)

  if (!resolved.ok) {
    return <LinkUnavailable />
  }

  const { share, resumeData, templateId } = resolved.value

  // Deny wrong share kind silently.
  if (share.kind !== 'recruiter' || !resumeData) {
    return <LinkUnavailable />
  }

  return <SharedResumeView templateId={templateId} data={resumeData} />
}

// ─── Link Unavailable ─────────────────────────────────────────────────────────

function LinkUnavailable() {
  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Link unavailable</h1>
      <p style={styles.body}>
        This share link has been revoked or does not exist. Please ask the
        sender for an updated link.
      </p>
    </main>
  )
}

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '4rem 1.5rem',
    fontFamily: 'Rubik, system-ui, sans-serif',
    textAlign: 'center' as const,
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
  },
} as const
