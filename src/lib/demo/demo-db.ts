'use client'

/**
 * demo-db.ts — IndexedDB-backed storage for demo mode.
 *
 * Demo mode lets visitors use the *real* app (same pages, same UI) without an
 * account. Instead of hitting Supabase, the client fetch interceptor
 * (demo-fetch.ts) reads/writes these object stores. Nothing is sent to the
 * server except stateless AI calls.
 *
 * Stores:
 *  - resumes  (keyPath 'id')   — the user's resumes
 *  - profile  (key 'current')  — the single stored profile, or absent
 *  - shares   (keyPath 'id')   — locally-tracked share links
 */

import type { Resume, ResumeData, UserProfile, Share } from '@/lib/types'

const DB_NAME = 'resumify-demo'
const DB_VERSION = 2
const RESUMES = 'resumes'
const PROFILE = 'profile'
const SHARES = 'shares'
const PROFILE_KEY = 'current'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(RESUMES)) db.createObjectStore(RESUMES, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(PROFILE)) db.createObjectStore(PROFILE)
      if (!db.objectStoreNames.contains(SHARES)) db.createObjectStore(SHARES, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'))
  })
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

// ─── ID + defaults ──────────────────────────────────────────────────────────

function uid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function emptyResumeData(): ResumeData {
  return {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    links: [],
    experience: [],
    projects: [],
    education: [],
    certifications: [],
    skills: [],
    achievements: [],
  }
}

function toResume(id: string, data: ResumeData, templateId: string | null, title: string): Resume {
  return {
    id,
    userId: 'demo',
    templateId,
    latexSource: null,
    pdfPath: null,
    title,
    ...data,
  }
}

// ─── Resumes ──────────────────────────────────────────────────────────────────

export async function listResumes(): Promise<Resume[]> {
  const all = await tx<Resume[]>(RESUMES, 'readonly', (s) => s.getAll())
  // Newest first by createdAt-ish: we store an implicit order via _createdAt.
  return (all ?? []).sort((a, b) => {
    const ca = (a as Resume & { _createdAt?: number })._createdAt ?? 0
    const cb = (b as Resume & { _createdAt?: number })._createdAt ?? 0
    return cb - ca
  })
}

export async function getResume(id: string): Promise<Resume | null> {
  const r = await tx<Resume | undefined>(RESUMES, 'readonly', (s) => s.get(id))
  return r ?? null
}

export async function createResume(templateId?: string): Promise<Resume> {
  const profile = await getProfile()
  const data: ResumeData = profile
    ? {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        summary: profile.summary,
        links: profile.links,
        experience: profile.experience,
        projects: profile.projects,
        education: profile.education,
        certifications: profile.certifications,
        skills: profile.skills,
        achievements: profile.achievements,
      }
    : emptyResumeData()

  const resume = {
    ...toResume(uid(), data, templateId ?? null, ''),
    _createdAt: Date.now(),
  } as Resume & { _createdAt: number }

  await tx(RESUMES, 'readwrite', (s) => s.put(resume))
  return resume
}

export async function saveResumeData(id: string, data: ResumeData): Promise<Resume | null> {
  const existing = await getResume(id)
  if (!existing) return null
  const updated = { ...existing, ...data } as Resume
  await tx(RESUMES, 'readwrite', (s) => s.put(updated))
  return updated
}

export async function renameResumeById(id: string, title: string): Promise<Resume | null> {
  const existing = await getResume(id)
  if (!existing) return null
  const updated = { ...existing, title } as Resume
  await tx(RESUMES, 'readwrite', (s) => s.put(updated))
  return updated
}

export async function setTemplate(id: string, templateId: string): Promise<Resume | null> {
  const existing = await getResume(id)
  if (!existing) return null
  const updated = { ...existing, templateId } as Resume
  await tx(RESUMES, 'readwrite', (s) => s.put(updated))
  return updated
}

export async function deleteResumeById(id: string): Promise<boolean> {
  const existing = await getResume(id)
  if (!existing) return false
  await tx(RESUMES, 'readwrite', (s) => s.delete(id))
  return true
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function getProfile(): Promise<UserProfile | null> {
  const p = await tx<UserProfile | undefined>(PROFILE, 'readonly', (s) => s.get(PROFILE_KEY))
  return p ?? null
}

export async function saveProfile(data: ResumeData): Promise<UserProfile> {
  const profile: UserProfile = {
    id: 'demo-profile',
    userId: 'demo',
    updatedAt: new Date().toISOString(),
    ...data,
  }
  await tx(PROFILE, 'readwrite', (s) => s.put(profile, PROFILE_KEY))
  return profile
}

export async function saveResumeToProfile(id: string): Promise<UserProfile | null> {
  const resume = await getResume(id)
  if (!resume) return null
  const { fullName, email, phone, location, summary, links, experience, projects, education, certifications, skills, achievements } = resume
  return saveProfile({ fullName, email, phone, location, summary, links, experience, projects, education, certifications, skills, achievements })
}

// ─── Shares (local only) ────────────────────────────────────────────────────

export async function listShares(resumeId: string): Promise<Share[]> {
  const all = await tx<Share[]>(SHARES, 'readonly', (s) => s.getAll())
  return (all ?? []).filter((s) => s.resumeId === resumeId && !s.revoked)
}

export async function createShare(resumeId: string, kind: 'recruiter' | 'template'): Promise<Share> {
  const share: Share = {
    id: uid(),
    resumeId,
    ownerId: 'demo',
    token: uid().replace(/-/g, ''),
    kind,
    revoked: false,
  }
  await tx(SHARES, 'readwrite', (s) => s.put(share))
  return share
}

export async function revokeShareById(id: string): Promise<boolean> {
  await tx(SHARES, 'readwrite', (s) => s.delete(id))
  return true
}

/** Wipes all demo data (used when exiting demo mode). */
export async function clearDemoData(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const t = db.transaction([RESUMES, PROFILE, SHARES], 'readwrite')
      t.objectStore(RESUMES).clear()
      t.objectStore(PROFILE).clear()
      t.objectStore(SHARES).clear()
      t.oncomplete = () => {
        db.close()
        resolve()
      }
      t.onerror = () => {
        db.close()
        resolve()
      }
    })
  } catch {
    /* ignore */
  }
}
