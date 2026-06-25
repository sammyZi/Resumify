/**
 * registry.ts — predefined resume templates (code-based, no LaTeX).
 *
 * Each template has a genuinely distinct visual design driven by its `id`
 * (see resume-document.module.css). The `structure` selects the DOM shape the
 * renderer produces (single column vs. two-column sidebar); the detailed look
 * (typography, rules, colors, decorations) is unique per template id.
 *
 * This module is pure data (no 'server-only', no React) so it can be imported
 * from both server routes and client components.
 */

/** DOM structure produced by the renderer. */
export type TemplateStructure = 'standard' | 'sidebar'

export type TemplateMeta = {
  /** Stable slug stored on resumes.template_id; also drives the unique CSS. */
  id: string
  /** Human-friendly name shown in the gallery. */
  name: string
  /** Category used for the gallery filter. */
  roleCategory: string
  /** One-line description of the look and feel. */
  description: string
  /** DOM structure the renderer produces. */
  structure: TemplateStructure
  /** Accent color (CSS color) used by the rendered document. */
  accent: string
}

export const TEMPLATES: readonly TemplateMeta[] = [
  {
    id: 'classic',
    name: 'Classic',
    roleCategory: 'General',
    description: 'Centered serif with hairline rules. Timeless and safe.',
    structure: 'standard',
    accent: '#1f2937',
  },
  {
    id: 'modern',
    name: 'Modern',
    roleCategory: 'General',
    description: 'Full-width colored header band with clean sans-serif.',
    structure: 'standard',
    accent: '#2563eb',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    roleCategory: 'Minimal',
    description: 'Airy whitespace, tiny uppercase labels, no rules.',
    structure: 'standard',
    accent: '#0f766e',
  },
  {
    id: 'technical',
    name: 'Technical',
    roleCategory: 'Engineering',
    description: 'Monospace headings with left-border section markers.',
    structure: 'standard',
    accent: '#7c3aed',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    roleCategory: 'Creative',
    description: 'Refined serif, centered name, letter-spaced titles.',
    structure: 'standard',
    accent: '#9d174d',
  },
  {
    id: 'bold',
    name: 'Bold',
    roleCategory: 'Creative',
    description: 'Oversized name on an accent block; loud section pills.',
    structure: 'standard',
    accent: '#ea580c',
  },
  {
    id: 'timeline',
    name: 'Timeline',
    roleCategory: 'General',
    description: 'Experience shown on a vertical timeline with markers.',
    structure: 'standard',
    accent: '#0891b2',
  },
  {
    id: 'compact',
    name: 'Compact',
    roleCategory: 'General',
    description: 'Dense, small type to fit more on a single page.',
    structure: 'standard',
    accent: '#b45309',
  },
  {
    id: 'aurora',
    name: 'Aurora',
    roleCategory: 'Creative',
    description: 'Indigo left sidebar for contact and skills.',
    structure: 'sidebar',
    accent: '#4f46e5',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    roleCategory: 'Executive',
    description: 'Right-hand charcoal sidebar with a serif main column.',
    structure: 'sidebar',
    accent: '#334155',
  },
] as const

/** The template used when a resume has no template selected. */
export const DEFAULT_TEMPLATE_ID = 'classic'

/** Look up a template by id, returning the default when not found. */
export function getTemplateMeta(id: string | null | undefined): TemplateMeta {
  const found = id ? TEMPLATES.find((t) => t.id === id) : undefined
  return found ?? TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID)!
}

/** True when `id` refers to a known template. */
export function isKnownTemplate(id: string | null | undefined): boolean {
  return Boolean(id) && TEMPLATES.some((t) => t.id === id)
}
