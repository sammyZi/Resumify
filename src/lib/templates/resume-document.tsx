/**
 * resume-document.tsx — renders ResumeData into a styled, printable document.
 *
 * The visual style is selected by `templateId` (see registry.ts). Each template
 * id maps to a distinct design in resume-document.module.css. Rendering is fully
 * deterministic — no AI, no LaTeX, no network. The same markup is shown in the
 * on-screen preview and sent to the browser's print-to-PDF.
 */

import type {
  ResumeData,
  ExperienceEntry,
  EducationEntry,
  ResumeLink,
  ProjectEntry,
  CertificationEntry,
} from '@/lib/types'
import { getTemplateMeta } from './registry'
import { MailIcon, PhoneIcon, PinIcon, LinkIcon, prettyUrl, linkLabel } from './icons'
import styles from './resume-document.module.css'

function formatPeriod(start: string, end: string | null): string {
  const s = start.trim()
  const e = (end ?? '').trim()
  if (!s && !e) return ''
  return `${s || '—'} – ${e || 'Present'}`
}

function linkText(link: ResumeLink): string {
  return prettyUrl(link.url) || linkLabel(link.type)
}

function ExperienceItem({ entry }: { entry: ExperienceEntry }) {
  return (
    <div className={styles.entry}>
      <div className={styles.entryTop}>
        <span className={styles.entryTitle}>
          {entry.title || 'Role'}
          {entry.organization ? (
            <span className={styles.entryOrg}> · {entry.organization}</span>
          ) : null}
        </span>
        <span className={styles.entryDates}>{formatPeriod(entry.startDate, entry.endDate)}</span>
      </div>
      {entry.description ? <div className={styles.entryDesc}>{entry.description}</div> : null}
    </div>
  )
}

function EducationItem({ entry }: { entry: EducationEntry }) {
  return (
    <div className={styles.entry}>
      <div className={styles.entryTop}>
        <span className={styles.entryTitle}>
          {entry.credential || 'Credential'}
          {entry.institution ? (
            <span className={styles.entryOrg}> · {entry.institution}</span>
          ) : null}
        </span>
        <span className={styles.entryDates}>{formatPeriod(entry.startDate, entry.endDate)}</span>
      </div>
      {entry.description ? <div className={styles.entryDesc}>{entry.description}</div> : null}
    </div>
  )
}

function ContactRow({ data }: { data: ResumeData }) {
  return (
    <div className={styles.contact}>
      {data.email ? (
        <a href={`mailto:${data.email}`} className={styles.contactItem}>
          <MailIcon /> {data.email}
        </a>
      ) : null}
      {data.phone ? (
        <a href={`tel:${data.phone}`} className={styles.contactItem}>
          <PhoneIcon /> {data.phone}
        </a>
      ) : null}
      {data.location ? (
        <span className={styles.contactItem}>
          <PinIcon /> {data.location}
        </span>
      ) : null}
    </div>
  )
}

function LinksRow({ links }: { links: ResumeLink[] }) {
  if (links.length === 0) return null
  return (
    <div className={styles.links}>
      {links.map((link, i) =>
        link.url ? (
          <a
            key={i}
            href={link.url}
            className={styles.linkItem}
            target="_blank"
            rel="noopener noreferrer"
          >
            <LinkIcon type={link.type} /> {linkText(link)}
          </a>
        ) : null
      )}
    </div>
  )
}

function SummarySection({ summary }: { summary: string }) {
  if (!summary.trim()) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Summary</h2>
      <p className={styles.summary}>{summary}</p>
    </section>
  )
}

function ProjectItem({ project }: { project: ProjectEntry }) {
  return (
    <div className={styles.entry}>
      <div className={styles.entryTop}>
        <span className={styles.entryTitle}>{project.name || 'Project'}</span>
        <span className={styles.projectLinks}>
          {project.liveUrl ? (
            <a
              href={project.liveUrl}
              className={styles.linkItem}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon type="website" /> Live
            </a>
          ) : null}
          {project.repoUrl ? (
            <a
              href={project.repoUrl}
              className={styles.linkItem}
              target="_blank"
              rel="noopener noreferrer"
            >
              <LinkIcon type="github" /> Code
            </a>
          ) : null}
        </span>
      </div>
      {project.description ? <div className={styles.entryDesc}>{project.description}</div> : null}
      {project.techStack.length > 0 ? (
        <div className={styles.techStack}>
          {project.techStack.map((tech, i) => (
            <span key={i} className={styles.techTag}>
              {tech}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function ProjectsSection({ data }: { data: ResumeData }) {
  if (data.projects.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Projects</h2>
      {data.projects.map((p, i) => (
        <ProjectItem key={i} project={p} />
      ))}
    </section>
  )
}

function CertificationsSection({
  certifications,
}: {
  certifications: CertificationEntry[]
}) {
  if (certifications.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Certifications</h2>
      {certifications.map((c, i) => (
        <div key={i} className={styles.entry}>
          <div className={styles.entryTop}>
            <span className={styles.entryTitle}>
              {c.name || 'Certification'}
              {c.issuer ? <span className={styles.entryOrg}> · {c.issuer}</span> : null}
            </span>
            {c.year ? <span className={styles.entryDates}>{c.year}</span> : null}
          </div>
        </div>
      ))}
    </section>
  )
}

function AchievementsSection({ achievements }: { achievements: string[] }) {
  if (achievements.length === 0) return null
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Achievements</h2>
      <ul className={styles.bulletList}>
        {achievements.map((a, i) => (
          <li key={i}>{a}</li>
        ))}
      </ul>
    </section>
  )
}

function ExperienceSection({ data }: { data: ResumeData }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Experience</h2>
      {data.experience.length > 0 ? (
        data.experience.map((entry, i) => <ExperienceItem key={i} entry={entry} />)
      ) : (
        <p className={styles.empty}>No experience added yet.</p>
      )}
    </section>
  )
}

function EducationSection({ data }: { data: ResumeData }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Education</h2>
      {data.education.length > 0 ? (
        data.education.map((entry, i) => <EducationItem key={i} entry={entry} />)
      ) : (
        <p className={styles.empty}>No education added yet.</p>
      )}
    </section>
  )
}

function SkillsSection({ data }: { data: ResumeData }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Skills</h2>
      {data.skills.length > 0 ? (
        <div className={styles.skills}>
          {data.skills.map((skill, i) => (
            <span key={i} className={styles.skill}>
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No skills added yet.</p>
      )}
    </section>
  )
}

export function ResumeDocument({
  templateId,
  data,
}: {
  templateId: string | null | undefined
  data: ResumeData
}) {
  const template = getTemplateMeta(templateId)
  const rootStyle = { ['--accent' as string]: template.accent }

  // ── Two-column sidebar structure ────────────────────────────────────────
  if (template.structure === 'sidebar') {
    return (
      <article
        className={styles.doc}
        data-template={template.id}
        data-structure="sidebar"
        style={rootStyle}
      >
        <aside className={styles.sidebar}>
          <div className={styles.sidebarName}>{data.fullName || 'Your Name'}</div>

          <h2 className={styles.sidebarTitle}>Contact</h2>
          <div className={styles.sidebarContactList}>
            <a href={`mailto:${data.email || ''}`} className={styles.contactItem}>
              <MailIcon /> {data.email || 'you@example.com'}
            </a>
            {data.phone ? (
              <a href={`tel:${data.phone}`} className={styles.contactItem}>
                <PhoneIcon /> {data.phone}
              </a>
            ) : null}
            {data.location ? (
              <span className={styles.contactItem}>
                <PinIcon /> {data.location}
              </span>
            ) : null}
            {data.links.map((link, i) =>
              link.url ? (
                <a
                  key={i}
                  href={link.url}
                  className={styles.contactItem}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkIcon type={link.type} /> {linkText(link)}
                </a>
              ) : null
            )}
          </div>

          <h2 className={styles.sidebarTitle}>Skills</h2>
          {data.skills.length > 0 ? (
            <ul className={styles.sidebarSkills}>
              {data.skills.map((skill, i) => (
                <li key={i}>{skill}</li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No skills added yet.</p>
          )}

          {data.certifications.length > 0 ? (
            <>
              <h2 className={styles.sidebarTitle}>Certifications</h2>
              <ul className={styles.sidebarSkills}>
                {data.certifications.map((c, i) => (
                  <li key={i}>
                    {c.name}
                    {c.year ? ` (${c.year})` : ''}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </aside>

        <div className={styles.main}>
          <SummarySection summary={data.summary} />
          <ExperienceSection data={data} />
          <ProjectsSection data={data} />
          <EducationSection data={data} />
          <AchievementsSection achievements={data.achievements} />
        </div>
      </article>
    )
  }

  // ── Single-column structure ──────────────────────────────────────────────
  return (
    <article
      className={styles.doc}
      data-template={template.id}
      data-structure="standard"
      style={rootStyle}
    >
      <header className={styles.header}>
        <div className={styles.name}>{data.fullName || 'Your Name'}</div>
        <ContactRow data={data} />
        <LinksRow links={data.links} />
      </header>

      <SummarySection summary={data.summary} />
      <ExperienceSection data={data} />
      <ProjectsSection data={data} />
      <EducationSection data={data} />
      <CertificationsSection certifications={data.certifications} />
      <SkillsSection data={data} />
      <AchievementsSection achievements={data.achievements} />
    </article>
  )
}
