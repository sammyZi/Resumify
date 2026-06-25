/**
 * page.tsx — GET /s/:token (Recruiter share page)
 *
 * Next.js Server Component. Resolves the share token server-side using the
 * service-role client (no user session required). Renders the resume PDF for
 * view and download, or a "link unavailable" message if the share is revoked,
 * missing, or of the wrong kind.
 *
 * No Resume_Data (personal info, experience, education, skills) is ever
 * rendered on this page — only the PDF artefact.
 *
 * Requirements: 8.3, 8.6, 10.3, 10.4, 10.5
 */

import { resolveShare } from '@/lib/services/share-service'
import { getSignedDownloadUrl } from '@/lib/services/file-store'

type PageProps = {
  params: Promise<{ token: string }>
}

export default async function RecruiterSharePage({ params }: PageProps) {
  const { token } = await params

  // Resolve the share — uses service-role client, no session needed.
  const resolved = await resolveShare(token)

  // Render link-unavailable for any failure (revoked, missing, db error).
  if (!resolved.ok) {
    return <LinkUnavailable />
  }

  const { share, pdfPath } = resolved.value

  // Deny wrong share kind silently (access_denied maps to link-unavailable).
  if (share.kind !== 'recruiter') {
    return <LinkUnavailable />
  }

  // If the resume exists but has no PDF yet, tell the visitor.
  if (!pdfPath) {
    return (
      <main style={styles.container}>
        <h1 style={styles.heading}>Resume</h1>
        <p style={styles.body}>PDF not yet generated. Check back later.</p>
      </main>
    )
  }

  // Obtain a short-lived signed URL (1 hour TTL) for viewing and downloading.
  const urlResult = await getSignedDownloadUrl(pdfPath, 3600)
  const signedUrl = urlResult.ok ? urlResult.value : null

  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Resume</h1>

      {signedUrl ? (
        <>
          {/* Embedded PDF viewer */}
          <iframe
            src={signedUrl}
            title="Resume PDF"
            style={styles.iframe}
            aria-label="Resume PDF viewer"
          />

          {/* Download button */}
          <a
            href={signedUrl}
            download="resume.pdf"
            style={styles.downloadButton}
            aria-label="Download resume PDF"
          >
            Download PDF
          </a>
        </>
      ) : (
        <p style={styles.body}>
          Unable to generate a download link. Please try again later.
        </p>
      )}
    </main>
  )
}

// ─── Link Unavailable component ───────────────────────────────────────────────

function LinkUnavailable() {
  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Link unavailable</h1>
      <p style={styles.body}>
        This share link is no longer valid or does not exist.
      </p>
    </main>
  )
}

// ─── Minimal inline styles (no CSS modules needed for a public page) ──────────

const styles = {
  container: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '2rem 1rem',
    fontFamily: 'Rubik, system-ui, sans-serif',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  body: {
    fontSize: '1rem',
    color: '#555',
  },
  iframe: {
    width: '100%',
    height: '80vh',
    border: 'none',
    display: 'block',
    marginBottom: '1rem',
  },
  downloadButton: {
    display: 'inline-block',
    padding: '0.625rem 1.25rem',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
} as const
