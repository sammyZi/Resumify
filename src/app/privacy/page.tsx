/**
 * privacy/page.tsx — Privacy Policy (public, standalone page).
 *
 * Server component. Describes what data Resumify collects and how it's used,
 * based on the actual app behaviour (Supabase auth + storage, OpenAI
 * refinement, server-side PDF generation, share links).
 */

import Link from 'next/link'
import styles from './privacy.module.css'

export const metadata = {
  title: 'Privacy Policy — Resumify',
}

const UPDATED = 'June 2026'

export default function PrivacyPolicyPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/" className={styles.back}>← Back to home</Link>

        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {UPDATED}</p>

        <p className={styles.lead}>
          Resumify (&quot;we&quot;, &quot;us&quot;) helps you build, refine, and share resumes. This
          policy explains what we collect, why, and the choices you have. We keep it short and
          plain because that&apos;s how privacy should be.
        </p>

        <Section title="1. Information we collect">
          <ul className={styles.list}>
            <li><strong>Account data</strong> — your email address, used to sign in and secure your account. If you sign in with Google, we receive your email and basic profile from Google.</li>
            <li><strong>Resume content</strong> — everything you enter into a resume or profile: name, phone, location, summary, links, work experience, projects, education, certifications, skills and achievements.</li>
            <li><strong>Usage essentials</strong> — session cookies needed to keep you logged in and your theme preference (stored locally in your browser).</li>
          </ul>
        </Section>

        <Section title="2. How we use your information">
          <ul className={styles.list}>
            <li>To create, store, edit, render and export your resumes as PDFs.</li>
            <li>To provide AI refinement: when you click an AI &quot;refine&quot; action, the relevant
              section of your resume is sent to our AI provider (OpenAI) to generate improved
              wording. This happens only when you trigger it.</li>
            <li>To generate public share links you explicitly create, and to render the resume
              for anyone who has that link until you revoke it.</li>
            <li>To authenticate you and keep your data scoped to your account.</li>
          </ul>
        </Section>

        <Section title="3. Where your data lives">
          <p>
            Your account and resume data are stored with our database and storage provider
            (Supabase). Access is protected by row-level security so each user can only read and
            write their own data. AI refinement requests are processed by OpenAI under their API
            terms; we do not use your content to train models.
          </p>
        </Section>

        <Section title="4. Sharing">
          <p>
            We do not sell your personal information. Your resume is private by default. It
            becomes viewable by others only through a share link that <em>you</em> create, and
            you can revoke any link at any time. Template shares never expose your personal
            contact details or content.
          </p>
        </Section>

        <Section title="5. Your choices and rights">
          <ul className={styles.list}>
            <li>Edit or delete any resume at any time from your dashboard.</li>
            <li>Revoke share links so they stop working immediately.</li>
            <li>Request deletion of your account and associated data by emailing us.</li>
            <li>Decline AI features — they are entirely optional and never required to build or download a resume.</li>
          </ul>
        </Section>

        <Section title="6. Data retention">
          <p>
            We keep your data while your account is active. When you delete a resume it is removed
            from our database; deleting your account removes your associated data.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            Questions about this policy or your data? Email{' '}
            <a className={styles.link} href="mailto:bhingesamarth@gmail.com">bhingesamarth@gmail.com</a>.
          </p>
        </Section>

        <div className={styles.footerLinks}>
          <Link href="/login">Sign in</Link>
          <span aria-hidden="true">·</span>
          <Link href="/">Home</Link>
        </div>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>{title}</h2>
      {children}
    </section>
  )
}
