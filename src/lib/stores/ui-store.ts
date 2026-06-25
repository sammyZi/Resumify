/**
 * ui-store.ts — Zustand store for ephemeral UI state.
 *
 * Organised into four slices:
 *  - Editor   : unsaved draft and dirty flag
 *  - Panel    : which side-panels are currently open
 *  - Progress : which resume is being AI-generated / compiled right now
 *  - Toast    : in-app notification queue
 *
 * This store is intentionally NOT persisted — all state is reset on page
 * load. Persistence for domain data lives in TanStack Query + Supabase.
 *
 * Requirements: 9.6
 */

import { create } from 'zustand'

// ─── Toast type ───────────────────────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  kind: ToastKind
}

// ─── Combined store state + actions ──────────────────────────────────────────

interface UIStore {
  // ── Editor slice ────────────────────────────────────────────────────────────
  /** Current unsaved draft content, or null when the editor is clean. */
  editorDraft: Record<string, unknown> | null
  /** Whether the draft differs from the last-saved version. */
  isDirty: boolean
  /** Replace the current draft and mark the editor dirty. */
  setEditorDraft: (draft: Record<string, unknown>) => void
  /** Clear the dirty flag (e.g., after a successful save). */
  markClean: () => void
  /** Explicitly mark the editor as dirty (e.g., after a local mutation). */
  markDirty: () => void

  // ── Panel slice ─────────────────────────────────────────────────────────────
  /** Set of panel IDs that are currently open. */
  openPanels: Set<string>
  /** Open a panel by ID (no-op if already open). */
  openPanel: (id: string) => void
  /** Close a panel by ID (no-op if already closed). */
  closePanel: (id: string) => void
  /** Toggle a panel open/closed. */
  togglePanel: (id: string) => void

  // ── Progress slice ──────────────────────────────────────────────────────────
  /** ID of the resume currently being AI-generated, or null. */
  generatingResumeId: string | null
  /** ID of the resume currently being LaTeX-compiled, or null. */
  compilingResumeId: string | null
  /** Set (or clear) the resume that is currently being generated. */
  setGenerating: (resumeId: string | null) => void
  /** Set (or clear) the resume that is currently being compiled. */
  setCompiling: (resumeId: string | null) => void

  // ── Toast slice ─────────────────────────────────────────────────────────────
  /** Ordered list of active toast notifications. */
  toasts: Toast[]
  /** Append a new toast; a unique ID is generated automatically. */
  addToast: (message: string, kind: ToastKind) => void
  /** Remove a toast by its ID. */
  removeToast: (id: string) => void
}

// ─── Store implementation ─────────────────────────────────────────────────────

export const useUIStore = create<UIStore>((set) => ({
  // ── Editor ──────────────────────────────────────────────────────────────────
  editorDraft: null,
  isDirty: false,

  setEditorDraft: (draft) => set({ editorDraft: draft, isDirty: true }),
  markClean: () => set({ isDirty: false }),
  markDirty: () => set({ isDirty: true }),

  // ── Panels ──────────────────────────────────────────────────────────────────
  openPanels: new Set<string>(),

  openPanel: (id) =>
    set((state) => {
      if (state.openPanels.has(id)) return state
      return { openPanels: new Set([...state.openPanels, id]) }
    }),

  closePanel: (id) =>
    set((state) => {
      if (!state.openPanels.has(id)) return state
      const next = new Set(state.openPanels)
      next.delete(id)
      return { openPanels: next }
    }),

  togglePanel: (id) =>
    set((state) => {
      const next = new Set(state.openPanels)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { openPanels: next }
    }),

  // ── Progress ─────────────────────────────────────────────────────────────────
  generatingResumeId: null,
  compilingResumeId: null,

  setGenerating: (resumeId) => set({ generatingResumeId: resumeId }),
  setCompiling: (resumeId) => set({ compilingResumeId: resumeId }),

  // ── Toasts ───────────────────────────────────────────────────────────────────
  toasts: [],

  addToast: (message, kind) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { id: crypto.randomUUID(), message, kind },
      ],
    })),

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}))
