/**
 * build-resume-html.ts — generates a self-contained HTML string of the resume.
 *
 * Used by the PDF API route. All CSS is inlined so Puppeteer needs no network
 * access. Links are rendered as real <a> elements so the PDF has clickable
 * annotations.
 *
 * This is plain TypeScript (no React) — it builds HTML strings directly so the
 * server route can call it without rendering a React tree.
 */

import type { ResumeData, ResumeLink, ExperienceEntry, EducationEntry, ProjectEntry, CertificationEntry } from '@/lib/types'
import type { TemplateMeta } from './registry'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function period(start: string, end: string | null): string {
  const s = start.trim()
  const e = (end ?? '').trim()
  if (!s && !e) return ''
  return `${s || '—'} – ${e || 'Present'}`
}

function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

function linkText(link: ResumeLink): string {
  return prettyUrl(link.url) || link.type
}

// ─── SVG icons (inline, monochrome) ──────────────────────────────────────────

const ICONS: Record<string, string> = {
  mail:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>`,
  phone:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.1 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  pin:    `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  globe:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10A15.3 15.3 0 0 1 12 2z"/></svg>`,
  github: `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  linkedin:`<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z"/></svg>`,
}

function icon(type: string): string {
  return ICONS[type] ?? ICONS.globe
}

function linkIcon(type: string): string {
  if (type === 'github') return icon('github')
  if (type === 'linkedin') return icon('linkedin')
  if (type === 'website') return icon('globe')
  return icon('globe')
}

// ─── Section builders ──────────────────────────────────────────────────────────

function contactRow(data: ResumeData, accent: string): string {
  const items: string[] = []
  if (data.email)    items.push(`<a href="mailto:${esc(data.email)}" style="color:${accent};text-decoration:none">${icon('mail')} ${esc(data.email)}</a>`)
  if (data.phone)    items.push(`<a href="tel:${esc(data.phone)}" style="color:inherit;text-decoration:none">${icon('phone')} ${esc(data.phone)}</a>`)
  if (data.location) items.push(`<span>${icon('pin')} ${esc(data.location)}</span>`)
  if (items.length === 0) return ''
  return `<div style="display:flex;flex-wrap:wrap;gap:4px 14px;font-size:10pt;color:#4b5563;margin-top:4px">${items.join('')}</div>`
}

function linksRow(links: ResumeLink[], accent: string): string {
  const items = links
    .filter((l) => l.url)
    .map(
      (l) =>
        `<a href="${esc(l.url)}" style="display:inline-flex;align-items:center;gap:3px;color:${accent};text-decoration:none;font-size:9.5pt">${linkIcon(l.type)} ${esc(linkText(l))}</a>`
    )
  if (items.length === 0) return ''
  return `<div style="display:flex;flex-wrap:wrap;gap:4px 14px;margin-top:4px">${items.join('')}</div>`
}

function sectionTitle(text: string, accent: string): string {
  return `<h2 style="font-size:12pt;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:${accent};border-bottom:2px solid ${accent};padding-bottom:3px;margin:14px 0 8px">${esc(text)}</h2>`
}

function entryHtml(
  title: string,
  sub: string,
  dates: string,
  description: string,
  accent: string
): string {
  return `
  <div style="margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
      <span style="font-weight:600;font-size:11pt">${esc(title)}${sub ? `<span style="color:#374151;font-weight:400"> · ${esc(sub)}</span>` : ''}</span>
      ${dates ? `<span style="color:#6b7280;font-size:9.5pt;white-space:nowrap">${esc(dates)}</span>` : ''}
    </div>
    ${description ? `<div style="margin-top:3px;font-size:10pt;color:#374151;white-space:pre-wrap">${esc(description)}</div>` : ''}
  </div>`
}

function experienceSection(entries: ExperienceEntry[], accent: string): string {
  if (entries.length === 0) return ''
  return sectionTitle('Experience', accent) +
    entries.map((e) => entryHtml(e.title, e.organization, period(e.startDate, e.endDate), e.description, accent)).join('')
}

function educationSection(entries: EducationEntry[], accent: string): string {
  if (entries.length === 0) return ''
  return sectionTitle('Education', accent) +
    entries.map((e) => entryHtml(e.credential, e.institution, period(e.startDate, e.endDate), e.description, accent)).join('')
}

function projectsSection(projects: ProjectEntry[], accent: string): string {
  if (projects.length === 0) return ''
  const items = projects.map((p) => {
    const linkParts: string[] = []
    if (p.liveUrl) linkParts.push(`<a href="${esc(p.liveUrl)}" style="color:${accent};text-decoration:none;font-size:9.5pt">${icon('globe')} Live</a>`)
    if (p.repoUrl) linkParts.push(`<a href="${esc(p.repoUrl)}" style="color:${accent};text-decoration:none;font-size:9.5pt">${icon('github')} Code</a>`)
    const tech = p.techStack.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${p.techStack.map((t) => `<span style="font-size:8.5pt;padding:1px 6px;border-radius:4px;background:color-mix(in srgb,${accent} 12%,#f3f4f6);color:color-mix(in srgb,${accent} 75%,#111)">${esc(t)}</span>`).join('')}</div>`
      : ''
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
        <span style="font-weight:600;font-size:11pt">${esc(p.name || 'Project')}</span>
        ${linkParts.length ? `<span style="display:flex;gap:12px">${linkParts.join('')}</span>` : ''}
      </div>
      ${p.description ? `<div style="margin-top:3px;font-size:10pt;color:#374151">${esc(p.description)}</div>` : ''}
      ${tech}
    </div>`
  }).join('')
  return sectionTitle('Projects', accent) + items
}

function skillsSection(skills: string[], accent: string): string {
  if (skills.length === 0) return ''
  const tags = skills.map(
    (s) => `<span style="font-size:9.5pt;padding:2px 8px;border-radius:9999px;border:1px solid color-mix(in srgb,${accent} 40%,#e5e7eb);color:${accent};background:color-mix(in srgb,${accent} 8%,transparent)">${esc(s)}</span>`
  ).join('')
  return sectionTitle('Skills', accent) + `<div style="display:flex;flex-wrap:wrap;gap:5px">${tags}</div>`
}

function formatCertDate(c: CertificationEntry): string {
  const start = c.issueDate || c.year || ''
  if (!start && !c.expiryDate) return ''
  if (!c.expiryDate) return start
  return `${start || '—'} – ${c.expiryDate}`
}

function certificationsSection(certs: CertificationEntry[], accent: string): string {
  if (certs.length === 0) return ''
  return sectionTitle('Certifications', accent) +
    certs.map((c) => {
      const dates = formatCertDate(c)
      const linkHtml = c.url ? `<a href="${esc(c.url)}" style="color:${accent};text-decoration:none;font-size:9.5pt;margin-left:8px">${icon('globe')} Credential</a>` : ''
      return `
      <div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <span style="font-weight:600;font-size:11pt">${esc(c.name || 'Certification')}${c.issuer ? `<span style="color:#374151;font-weight:400"> · ${esc(c.issuer)}</span>` : ''}${linkHtml}</span>
          ${dates ? `<span style="color:#6b7280;font-size:9.5pt;white-space:nowrap">${esc(dates)}</span>` : ''}
        </div>
      </div>`
    }).join('')
}

function achievementsSection(achievements: string[], accent: string): string {
  if (achievements.length === 0) return ''
  const items = achievements.map((a) => `<li style="margin-bottom:3px">${esc(a)}</li>`).join('')
  return sectionTitle('Achievements', accent) + `<ul style="padding-left:18px;font-size:10pt;color:#374151">${items}</ul>`
}

function summarySection(summary: string, accent: string): string {
  if (!summary.trim()) return ''
  return sectionTitle('Summary', accent) + `<p style="font-size:10pt;color:#374151">${esc(summary)}</p>`
}

// ─── Main builder ──────────────────────────────────────────────────────────────

export function buildResumeHtml(template: TemplateMeta, data: ResumeData): string {
  const { accent } = template

  const body = `
    <header style="margin-bottom:14px;text-align:center;border-bottom:1px solid #d1d5db;padding-bottom:12px">
      <div style="font-size:26pt;font-weight:700;letter-spacing:-.01em;color:${accent};line-height:1.1">${esc(data.fullName || 'Your Name')}</div>
      ${contactRow(data, accent)}
      ${linksRow(data.links, accent)}
    </header>
    ${summarySection(data.summary, accent)}
    ${experienceSection(data.experience, accent)}
    ${projectsSection(data.projects, accent)}
    ${educationSection(data.education, accent)}
    ${certificationsSection(data.certifications, accent)}
    ${skillsSection(data.skills, accent)}
    ${achievementsSection(data.achievements, accent)}
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(data.fullName || 'Resume')}</title>
  <style>
    @page { size: Letter; margin: 0.75in 0.8in; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #1a1a1a;
      background: #fff;
    }
    a { color: inherit; }
  </style>
</head>
<body>${body}</body>
</html>`
}
