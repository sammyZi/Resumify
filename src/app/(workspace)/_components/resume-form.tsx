'use client'

/**
 * resume-form.tsx — shared ResumeData form component.
 *
 * Used by both the resume editor (/resumes/[id]) and profile editor (/profile).
 * Handles all ResumeData fields: contact, experience entries, education entries,
 * and skills.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 5.7, 11.1, 11.8, 11.9
 */

import { useState } from 'react'
import type {
  ResumeData,
  ExperienceEntry,
  EducationEntry,
  ResumeLink,
  ProjectEntry,
  CertificationEntry,
} from '@/lib/types'
import { FieldErrors } from './field-errors'
import { LinkTypeSelect } from './link-type-select'
import { RefineFieldButton } from './refine-field-button'
import styles from './workspace-ui.module.css'

interface ResumeFormProps {
  /** Initial data to populate the form with. */
  initialData: ResumeData
  /** Whether the save mutation is in progress. */
  isSaving: boolean
  /** Field-level errors from the API response. */
  fieldErrors: Record<string, string[]> | null
  /** Called with the current form data when the user submits. */
  onSave: (data: ResumeData) => void
  /** Optional extra actions rendered in the form actions bar. */
  extraActions?: React.ReactNode
  /** Optional save feedback notice (success/error banner). */
  saveNotice?: React.ReactNode
  /**
   * Resume id (or 'profile') used by inline refine buttons.
   * When omitted, refine buttons are hidden.
   */
  resumeId?: string
  /** Called by the form once it has its live-data snapshot function ready, so the parent can pass it to other components (e.g. RefinePanel). */
  onGetDataReady?: (getter: () => Record<string, unknown>) => void
}

function emptyExperience(): ExperienceEntry {
  return { title: '', organization: '', startDate: '', endDate: null, description: '' }
}

function emptyEducation(): EducationEntry {
  return { institution: '', credential: '', startDate: '', endDate: null, description: '' }
}

function emptyProject(): ProjectEntry {
  return { name: '', description: '', techStack: [], liveUrl: '', repoUrl: '' }
}

function emptyCertification(): CertificationEntry {
  return { name: '', issuer: '', year: '', url: '', issueDate: '', expiryDate: '' }
}

/**
 * TechStackInput — free-text input that lets the user type commas/spaces freely
 * while emitting the parsed array. Keeps its own raw text so typing isn't
 * normalized on every keystroke (which previously ate commas/spaces).
 */
function TechStackInput({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: string[]
  onChange: (v: string[]) => void
  className?: string
}) {
  const [text, setText] = useState(value.join(', '))

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setText(raw)
    onChange(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
  }

  return (
    <input
      id={id}
      type="text"
      placeholder="React, Node.js, PostgreSQL"
      className={className}
      value={text}
      onChange={handleChange}
    />
  )
}


export function ResumeForm({
  initialData,
  isSaving,
  fieldErrors,
  onSave,
  extraActions,
  saveNotice,
  resumeId,
  onGetDataReady,
}: ResumeFormProps) {
  const [fullName, setFullName] = useState(initialData.fullName)
  const [email, setEmail] = useState(initialData.email)
  const [phone, setPhone] = useState(initialData.phone)
  const [location, setLocation] = useState(initialData.location)
  const [summary, setSummary] = useState(initialData.summary)
  const [links, setLinks] = useState<ResumeLink[]>(initialData.links)
  const [experience, setExperience] = useState<ExperienceEntry[]>(initialData.experience)
  const [projects, setProjects] = useState<ProjectEntry[]>(initialData.projects)
  const [education, setEducation] = useState<EducationEntry[]>(initialData.education)
  const [certifications, setCertifications] = useState<CertificationEntry[]>(initialData.certifications)
  const [skills, setSkills] = useState<string[]>(initialData.skills)
  const [skillInput, setSkillInput] = useState('')
  const [achievements, setAchievements] = useState<string[]>(initialData.achievements)
  const [achievementInput, setAchievementInput] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave({
      fullName,
      email,
      phone,
      location,
      summary,
      links,
      experience,
      projects,
      education,
      certifications,
      skills,
      achievements,
    })
  }

  // ── Project helpers ─────────────────────────────────────────────────────────

  function addProject() {
    setProjects((prev) => [...prev, emptyProject()])
  }

  function removeProject(idx: number) {
    setProjects((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateProject<K extends keyof ProjectEntry>(idx: number, field: K, value: ProjectEntry[K]) {
    setProjects((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  // ── Certification helpers ────────────────────────────────────────────────────

  function addCertification() {
    setCertifications((prev) => [...prev, emptyCertification()])
  }

  function removeCertification(idx: number) {
    setCertifications((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateCertification<K extends keyof CertificationEntry>(
    idx: number,
    field: K,
    value: CertificationEntry[K]
  ) {
    setCertifications((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  // ── Achievement helpers ──────────────────────────────────────────────────────

  function addAchievement() {
    const trimmed = achievementInput.trim()
    if (!trimmed) return
    setAchievements((prev) => [...prev, trimmed])
    setAchievementInput('')
  }

  function removeAchievement(idx: number) {
    setAchievements((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleAchievementKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addAchievement()
    }
  }

  // ── Link helpers ──────────────────────────────────────────────────────────

  function addLink() {
    setLinks((prev) => [...prev, { type: 'linkedin', url: '' }])
  }

  function removeLink(idx: number) {
    setLinks((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateLink<K extends keyof ResumeLink>(idx: number, field: K, value: ResumeLink[K]) {
    setLinks((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)))
  }

  // ── Experience helpers ────────────────────────────────────────────────────

  function addExperience() {
    setExperience((prev) => [...prev, emptyExperience()])
  }

  function removeExperience(idx: number) {
    setExperience((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateExperience<K extends keyof ExperienceEntry>(
    idx: number,
    field: K,
    value: ExperienceEntry[K]
  ) {
    setExperience((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry))
    )
  }

  // ── Education helpers ─────────────────────────────────────────────────────

  function addEducation() {
    setEducation((prev) => [...prev, emptyEducation()])
  }

  function removeEducation(idx: number) {
    setEducation((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateEducation<K extends keyof EducationEntry>(
    idx: number,
    field: K,
    value: EducationEntry[K]
  ) {
    setEducation((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry))
    )
  }

  // ── Skill helpers ─────────────────────────────────────────────────────────

  function addSkill() {
    const trimmed = skillInput.trim()
    if (!trimmed) return
    setSkills((prev) => [...prev, trimmed])
    setSkillInput('')
  }

  function removeSkill(idx: number) {
    setSkills((prev) => prev.filter((_, i) => i !== idx))
  }

  function handleSkillKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSkill()
    }
  }

  // ── Snapshot for refine API ───────────────────────────────────────────────
  const getFormData = (): Record<string, unknown> => ({
    fullName, email, phone, location, summary, links,
    experience, projects, education, certifications, skills, achievements,
  })

  // Always use our own live form snapshot (parent's getData is no longer needed).
  const resolvedGetData = getFormData

  // Notify parent of the getter so it can pass it to RefinePanel etc.
  // Use a layout-style effect-free approach — just call it on every render.
  // The parent stores it in a ref so this is safe.
  if (onGetDataReady) onGetDataReady(resolvedGetData)

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* ── Contact ────────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Contact</h2>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              className={`${styles.input} ${fieldErrors?.fullName ? styles.inputError : ''}`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
            <FieldErrors errors={fieldErrors} field="fullName" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={`${styles.input} ${fieldErrors?.email ? styles.inputError : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldErrors errors={fieldErrors} field="email" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 (555) 123-4567"
              className={`${styles.input} ${fieldErrors?.phone ? styles.inputError : ''}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <FieldErrors errors={fieldErrors} field="phone" />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="location">
              Location
            </label>
            <input
              id="location"
              name="location"
              type="text"
              autoComplete="address-level2"
              placeholder="City, Country"
              className={`${styles.input} ${fieldErrors?.location ? styles.inputError : ''}`}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <FieldErrors errors={fieldErrors} field="location" />
          </div>

          <div className={`${styles.field} ${styles.fieldFull}`}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="summary">
                Professional summary
              </label>
              {resumeId && (
                <RefineFieldButton
                  resumeId={resumeId}
                  scope={{ kind: 'summary' }}
                  extract="summary"
                  onAccept={(val) => setSummary(val)}
                  getData={resolvedGetData}
                  disabled={isSaving}
                />
              )}
            </div>
            <textarea
              id="summary"
              name="summary"
              placeholder="A short headline about who you are and what you do."
              className={`${styles.input} ${styles.textarea} ${fieldErrors?.summary ? styles.inputError : ''}`}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
            <FieldErrors errors={fieldErrors} field="summary" />
          </div>
        </div>
      </section>

      {/* ── Links & socials ────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Links &amp; socials</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={addLink}
            disabled={links.length >= 15}
          >
            + Add link
          </button>
        </div>

        {links.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '0.5rem 0', textAlign: 'left' }}>
            Add LinkedIn, GitHub, LeetCode, a portfolio site, and more.
          </p>
        )}

        {links.map((link, idx) => (
          <div key={idx} className={styles.linkRow}>
            <LinkTypeSelect
              value={link.type}
              onChange={(type) => updateLink(idx, 'type', type)}
              label={`Link ${idx + 1} type`}
            />
            <input
              type="url"
              placeholder="https://…"
              className={`${styles.input} ${styles.linkUrlInput}`}
              value={link.url}
              onChange={(e) => updateLink(idx, 'url', e.target.value)}
              aria-label={`Link ${idx + 1} URL`}
            />
            <button
              type="button"
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={() => removeLink(idx)}
              aria-label={`Remove link ${idx + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </section>

      {/* ── Experience ─────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Experience</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={addExperience}
            disabled={experience.length >= 50}
          >
            + Add entry
          </button>
        </div>

        <FieldErrors errors={fieldErrors} field="experience" />

        {experience.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '1rem 0', textAlign: 'left' }}>
            No experience entries yet.
          </p>
        )}

        {experience.map((entry, idx) => (
          <div key={idx} className={styles.entryCard}>
            <div className={styles.entryCardHeader}>
              <span className={styles.entryCardTitle}>Entry {idx + 1}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={() => removeExperience(idx)}
                aria-label={`Remove experience entry ${idx + 1}`}
              >
                Remove
              </button>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`exp-title-${idx}`}>
                  Title
                </label>
                <input
                  id={`exp-title-${idx}`}
                  type="text"
                  className={`${styles.input} ${fieldErrors?.[`experience[${idx}].title`] ? styles.inputError : ''}`}
                  value={entry.title}
                  onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`experience[${idx}].title`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`exp-org-${idx}`}>
                  Organization
                </label>
                <input
                  id={`exp-org-${idx}`}
                  type="text"
                  className={`${styles.input} ${fieldErrors?.[`experience[${idx}].organization`] ? styles.inputError : ''}`}
                  value={entry.organization}
                  onChange={(e) => updateExperience(idx, 'organization', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`experience[${idx}].organization`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`exp-start-${idx}`}>
                  Start date
                </label>
                <input
                  id={`exp-start-${idx}`}
                  type="text"
                  placeholder="e.g. 2020-01"
                  className={`${styles.input} ${fieldErrors?.[`experience[${idx}].startDate`] ? styles.inputError : ''}`}
                  value={entry.startDate}
                  onChange={(e) => updateExperience(idx, 'startDate', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`experience[${idx}].startDate`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`exp-end-${idx}`}>
                  End date
                </label>
                <input
                  id={`exp-end-${idx}`}
                  type="text"
                  placeholder="e.g. 2023-06 or leave blank"
                  className={`${styles.input} ${fieldErrors?.[`experience[${idx}].endDate`] ? styles.inputError : ''}`}
                  value={entry.endDate ?? ''}
                  onChange={(e) =>
                    updateExperience(idx, 'endDate', e.target.value || null)
                  }
                />
                <FieldErrors errors={fieldErrors} field={`experience[${idx}].endDate`} />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor={`exp-desc-${idx}`}>
                    Description
                  </label>
                  {resumeId && (
                    <RefineFieldButton
                      resumeId={resumeId}
                      scope={{ kind: 'entry', section: 'experience', index: idx }}
                      extract="description"
                      onAccept={(val) => updateExperience(idx, 'description', val)}
                      getData={resolvedGetData}
                  disabled={isSaving}
                    />
                  )}
                </div>
                <textarea
                  id={`exp-desc-${idx}`}
                  className={`${styles.input} ${styles.textarea} ${fieldErrors?.[`experience[${idx}].description`] ? styles.inputError : ''}`}
                  value={entry.description}
                  onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`experience[${idx}].description`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Projects ──────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Projects</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={addProject}
            disabled={projects.length >= 50}
          >
            + Add project
          </button>
        </div>

        <FieldErrors errors={fieldErrors} field="projects" />

        {projects.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '1rem 0', textAlign: 'left' }}>
            Showcase side projects with a live link, repo, and the tech you used.
          </p>
        )}

        {projects.map((project, idx) => (
          <div key={idx} className={styles.entryCard}>
            <div className={styles.entryCardHeader}>
              <span className={styles.entryCardTitle}>Project {idx + 1}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={() => removeProject(idx)}
                aria-label={`Remove project ${idx + 1}`}
              >
                Remove
              </button>
            </div>

            <div className={styles.fieldGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`proj-name-${idx}`}>
                  Project name
                </label>
                <input
                  id={`proj-name-${idx}`}
                  type="text"
                  className={styles.input}
                  value={project.name}
                  onChange={(e) => updateProject(idx, 'name', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`proj-live-${idx}`}>
                  Live link
                </label>
                <input
                  id={`proj-live-${idx}`}
                  type="url"
                  placeholder="https://…"
                  className={styles.input}
                  value={project.liveUrl}
                  onChange={(e) => updateProject(idx, 'liveUrl', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`proj-repo-${idx}`}>
                  GitHub / repo link
                </label>
                <input
                  id={`proj-repo-${idx}`}
                  type="url"
                  placeholder="https://github.com/…"
                  className={styles.input}
                  value={project.repoUrl}
                  onChange={(e) => updateProject(idx, 'repoUrl', e.target.value)}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`proj-tech-${idx}`}>
                  Tech stack <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>(comma separated)</span>
                </label>
                <TechStackInput
                  id={`proj-tech-${idx}`}
                  className={styles.input}
                  value={project.techStack}
                  onChange={(v) => updateProject(idx, 'techStack', v)}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor={`proj-desc-${idx}`}>
                    Description
                  </label>
                  {resumeId && (
                    <RefineFieldButton
                      resumeId={resumeId}
                      scope={{ kind: 'project', index: idx }}
                      extract="project"
                      onAccept={(val) => updateProject(idx, 'description', val)}
                      getData={resolvedGetData}
                  disabled={isSaving}
                    />
                  )}
                </div>
                <textarea
                  id={`proj-desc-${idx}`}
                  className={`${styles.input} ${styles.textarea}`}
                  value={project.description}
                  onChange={(e) => updateProject(idx, 'description', e.target.value)}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Education ──────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Education</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={addEducation}
            disabled={education.length >= 50}
          >
            + Add entry
          </button>
        </div>

        <FieldErrors errors={fieldErrors} field="education" />

        {education.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '1rem 0', textAlign: 'left' }}>
            No education entries yet.
          </p>
        )}

        {education.map((entry, idx) => (
          <div key={idx} className={styles.entryCard}>
            <div className={styles.entryCardHeader}>
              <span className={styles.entryCardTitle}>Entry {idx + 1}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={() => removeEducation(idx)}
                aria-label={`Remove education entry ${idx + 1}`}
              >
                Remove
              </button>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor={`edu-inst-${idx}`}>
                  Institution
                </label>
                <input
                  id={`edu-inst-${idx}`}
                  type="text"
                  className={`${styles.input} ${fieldErrors?.[`education[${idx}].institution`] ? styles.inputError : ''}`}
                  value={entry.institution}
                  onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`education[${idx}].institution`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`edu-cred-${idx}`}>
                  Credential
                </label>
                <input
                  id={`edu-cred-${idx}`}
                  type="text"
                  className={`${styles.input} ${fieldErrors?.[`education[${idx}].credential`] ? styles.inputError : ''}`}
                  value={entry.credential}
                  onChange={(e) => updateEducation(idx, 'credential', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`education[${idx}].credential`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`edu-start-${idx}`}>
                  Start date
                </label>
                <input
                  id={`edu-start-${idx}`}
                  type="text"
                  placeholder="e.g. 2018-09"
                  className={`${styles.input} ${fieldErrors?.[`education[${idx}].startDate`] ? styles.inputError : ''}`}
                  value={entry.startDate}
                  onChange={(e) => updateEducation(idx, 'startDate', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`education[${idx}].startDate`} />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`edu-end-${idx}`}>
                  End date
                </label>
                <input
                  id={`edu-end-${idx}`}
                  type="text"
                  placeholder="e.g. 2022-05 or leave blank"
                  className={`${styles.input} ${fieldErrors?.[`education[${idx}].endDate`] ? styles.inputError : ''}`}
                  value={entry.endDate ?? ''}
                  onChange={(e) =>
                    updateEducation(idx, 'endDate', e.target.value || null)
                  }
                />
                <FieldErrors errors={fieldErrors} field={`education[${idx}].endDate`} />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor={`edu-desc-${idx}`}>
                    Description
                  </label>
                  {resumeId && (
                    <RefineFieldButton
                      resumeId={resumeId}
                      scope={{ kind: 'entry', section: 'education', index: idx }}
                      extract="description"
                      onAccept={(val) => updateEducation(idx, 'description', val)}
                      getData={resolvedGetData}
                  disabled={isSaving}
                    />
                  )}
                </div>
                <textarea
                  id={`edu-desc-${idx}`}
                  className={`${styles.input} ${styles.textarea} ${fieldErrors?.[`education[${idx}].description`] ? styles.inputError : ''}`}
                  value={entry.description}
                  onChange={(e) => updateEducation(idx, 'description', e.target.value)}
                />
                <FieldErrors errors={fieldErrors} field={`education[${idx}].description`} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Certifications ─────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Certifications</h2>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
            onClick={addCertification}
            disabled={certifications.length >= 50}
          >
            + Add certification
          </button>
        </div>

        <FieldErrors errors={fieldErrors} field="certifications" />

        {certifications.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '1rem 0', textAlign: 'left' }}>
            Add licenses or certifications (e.g. AWS, PMP, Scrum).
          </p>
        )}

        {certifications.map((cert, idx) => (
          <div key={idx} className={styles.entryCard}>
            <div className={styles.entryCardHeader}>
              <span className={styles.entryCardTitle}>Certification {idx + 1}</span>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonDanger}`}
                onClick={() => removeCertification(idx)}
                aria-label={`Remove certification ${idx + 1}`}
              >
                Remove
              </button>
            </div>

            <div className={styles.fieldGrid}>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`cert-name-${idx}`}>
                  Name
                </label>
                <input
                  id={`cert-name-${idx}`}
                  type="text"
                  className={styles.input}
                  value={cert.name}
                  onChange={(e) => updateCertification(idx, 'name', e.target.value)}
                />
              </div>

              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label} htmlFor={`cert-url-${idx}`}>
                  Credential / Verification Link
                </label>
                <input
                  id={`cert-url-${idx}`}
                  type="url"
                  placeholder="https://credly.com/..."
                  className={styles.input}
                  value={cert.url || ''}
                  onChange={(e) => updateCertification(idx, 'url', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`cert-issuer-${idx}`}>
                  Issuer
                </label>
                <input
                  id={`cert-issuer-${idx}`}
                  type="text"
                  placeholder="AWS"
                  className={styles.input}
                  value={cert.issuer}
                  onChange={(e) => updateCertification(idx, 'issuer', e.target.value)}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`cert-issueDate-${idx}`}>
                  Issue Date (or Year)
                </label>
                <input
                  id={`cert-issueDate-${idx}`}
                  type="text"
                  placeholder="2024-05 or 2024"
                  className={styles.input}
                  value={cert.issueDate || cert.year || ''}
                  onChange={(e) => {
                    updateCertification(idx, 'issueDate', e.target.value)
                    updateCertification(idx, 'year', e.target.value)
                  }}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor={`cert-expiryDate-${idx}`}>
                  Expiry Date (Optional)
                </label>
                <input
                  id={`cert-expiryDate-${idx}`}
                  type="text"
                  placeholder="2027-05 or Does not expire"
                  className={styles.input}
                  value={cert.expiryDate || ''}
                  onChange={(e) => updateCertification(idx, 'expiryDate', e.target.value || null)}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── Skills ─────────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            Skills
          </h2>
          {resumeId && (
            <RefineFieldButton
              resumeId={resumeId}
              scope={{ kind: 'section', section: 'skills' }}
              extract="skills"
              onAccept={(val) => {
                // val is comma-separated skills string
                const refined = val.split(',').map((s) => s.trim()).filter(Boolean)
                setSkills(refined)
              }}
              getData={resolvedGetData}
                  disabled={isSaving}
            />
          )}
        </div>
        <FieldErrors errors={fieldErrors} field="skills" />

        {skills.length > 0 && (
          <div className={styles.skillsList} aria-label="Skills">
            {skills.map((skill, idx) => (
              <span key={idx} className={styles.skillTag}>
                {skill}
                <button
                  type="button"
                  className={styles.skillRemove}
                  onClick={() => removeSkill(idx)}
                  aria-label={`Remove skill ${skill}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {skills.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '0.5rem 0', textAlign: 'left' }}>
            No skills added yet.
          </p>
        )}

        {skills.length < 50 && (
          <div className={styles.skillInputRow}>
            <input
              type="text"
              placeholder="Type a skill and press Enter or Add"
              className={`${styles.input} ${styles.skillInput}`}
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              aria-label="New skill"
            />
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              onClick={addSkill}
            >
              Add
            </button>
          </div>
        )}
      </section>

      {/* ── Achievements ───────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Achievements</h2>
        </div>

        <FieldErrors errors={fieldErrors} field="achievements" />

        {achievements.length > 0 && (
          <ul className={styles.achievementList} aria-label="Achievements">
            {achievements.map((item, idx) => (
              <li key={idx} className={styles.achievementItem}>
                <span>{item}</span>
                <button
                  type="button"
                  className={styles.skillRemove}
                  onClick={() => removeAchievement(idx)}
                  aria-label={`Remove achievement ${idx + 1}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {achievements.length === 0 && (
          <p className={styles.emptyState} style={{ padding: '0.5rem 0', textAlign: 'left' }}>
            Add awards, talks, or notable wins.
          </p>
        )}

        {achievements.length < 50 && (
          <div className={styles.skillInputRow}>
            <input
              type="text"
              placeholder="Type an achievement and press Enter or Add"
              className={`${styles.input} ${styles.skillInput}`}
              value={achievementInput}
              onChange={(e) => setAchievementInput(e.target.value)}
              onKeyDown={handleAchievementKeyDown}
              aria-label="New achievement"
            />
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary} ${styles.buttonSmall}`}
              onClick={addAchievement}
            >
              Add
            </button>
          </div>
        )}
      </section>

      {/* ── Form actions ───────────────────────────────────────────────────── */}
      <div className={styles.formActions}>
        <button type="submit" className={styles.button} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </button>
        {extraActions}
      </div>

      {saveNotice && <div>{saveNotice}</div>}
    </form>
  )
}

