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
import type { ResumeData, ExperienceEntry, EducationEntry } from '@/lib/types'
import { FieldErrors } from './field-errors'
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
}

function emptyExperience(): ExperienceEntry {
  return { title: '', organization: '', startDate: '', endDate: null, description: '' }
}

function emptyEducation(): EducationEntry {
  return { institution: '', credential: '', startDate: '', endDate: null, description: '' }
}

export function ResumeForm({
  initialData,
  isSaving,
  fieldErrors,
  onSave,
  extraActions,
  saveNotice,
}: ResumeFormProps) {
  const [fullName, setFullName] = useState(initialData.fullName)
  const [email, setEmail] = useState(initialData.email)
  const [experience, setExperience] = useState<ExperienceEntry[]>(initialData.experience)
  const [education, setEducation] = useState<EducationEntry[]>(initialData.education)
  const [skills, setSkills] = useState<string[]>(initialData.skills)
  const [skillInput, setSkillInput] = useState('')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSave({ fullName, email, experience, education, skills })
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
        </div>
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
                <label className={styles.label} htmlFor={`exp-desc-${idx}`}>
                  Description
                </label>
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
                <label className={styles.label} htmlFor={`edu-desc-${idx}`}>
                  Description
                </label>
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

      {/* ── Skills ─────────────────────────────────────────────────────────── */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Skills</h2>
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
