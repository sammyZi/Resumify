/**
 * icons.tsx — inline SVG icons for contact details and social/profile links.
 *
 * Brand glyphs use single-path marks (fill: currentColor); contact glyphs use
 * stroked line icons. All scale to the surrounding font via width/height in em.
 */

import type { LinkType } from '@/lib/types'

type IconProps = { size?: number }

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
  }
}

// ── Contact (stroked) ──────────────────────────────────────────────────────

export function MailIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-10 6L2 7" />
    </svg>
  )
}

export function PhoneIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function PinIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

// ── Brand / link glyphs (filled single path) ────────────────────────────────

const BRAND_PATHS: Record<LinkType, string | null> = {
  github:
    'M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .322.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
  leetcode:
    'M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 1.271 1.818l4.277 4.193.039.038c2.248 2.165 5.852 2.133 8.063-.074l2.396-2.392c.54-.54.54-1.414.003-1.955a1.378 1.378 0 0 0-1.951-.003l-2.396 2.392a3.021 3.021 0 0 1-4.205.038l-.02-.019-4.276-4.193c-.652-.64-.972-1.469-.948-2.263a2.68 2.68 0 0 1 .066-.523 2.545 2.545 0 0 1 .619-1.164L9.13 8.114c1.058-1.134 3.204-1.27 4.43-.278l3.501 2.831c.593.48 1.461.387 1.94-.207a1.384 1.384 0 0 0-.207-1.943l-3.5-2.831c-.8-.647-1.766-1.045-2.774-1.202l2.015-2.158A1.384 1.384 0 0 0 13.483 0zm-2.866 12.815a1.38 1.38 0 0 0-1.38 1.382 1.38 1.38 0 0 0 1.38 1.382H20.79a1.38 1.38 0 0 0 1.38-1.382 1.38 1.38 0 0 0-1.38-1.382z',
  twitter:
    'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  dribbble:
    'M12 0C5.372 0 0 5.373 0 12s5.372 12 12 12c6.627 0 12-5.373 12-12S18.627 0 12 0zm9.885 11.441c-2.575-.422-4.943-.445-7.103-.073-.244-.563-.497-1.125-.767-1.68 2.31-1 4.165-2.358 5.548-4.082 1.35 1.594 2.197 3.619 2.322 5.835zm-3.842-7.282c-1.205 1.554-2.868 2.783-4.986 3.68-1.016-1.861-2.178-3.676-3.488-5.438.779-.197 1.591-.314 2.431-.314 2.275 0 4.368.806 6.043 2.072zM7.527 3.74c1.291 1.747 2.439 3.531 3.448 5.382-2.6.766-5.587 1.18-8.969 1.187.439-2.842 2.328-5.206 4.521-6.569zM2.227 12.474c0-.176.007-.351.013-.526 3.71-.034 6.962-.546 9.755-1.535.218.43.426.864.621 1.301-3.207 1.022-5.864 2.989-7.957 5.84-1.508-1.504-2.432-3.587-2.432-5.08zm3.71 6.594c1.893-2.616 4.32-4.428 7.275-5.355.78 2.084 1.39 4.247 1.8 6.473-1.04.43-2.18.665-3.376.665-2.207 0-4.227-.804-5.699-1.783zm10.99-.785c-.382-2.058-.948-4.066-1.679-6.022 1.916-.32 4.029-.272 6.366.139-.503 2.41-2.069 4.461-4.687 5.883z',
  medium:
    'M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.86 0-3.38-2.88-3.38-6.42s1.52-6.42 3.38-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z',
  website: null,
  other: null,
}

function GlobeIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size)} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

/** Icon for a given link type. */
export function LinkIcon({ type, size = 12 }: { type: LinkType; size?: number }) {
  const path = BRAND_PATHS[type]
  if (!path) {
    return <GlobeIcon size={size} />
  }
  return (
    <svg {...svgProps(size)} fill="currentColor">
      <path d={path} />
    </svg>
  )
}

/** Human label for a link type. */
export function linkLabel(type: LinkType): string {
  switch (type) {
    case 'website':
      return 'Website'
    case 'linkedin':
      return 'LinkedIn'
    case 'github':
      return 'GitHub'
    case 'leetcode':
      return 'LeetCode'
    case 'twitter':
      return 'X'
    case 'dribbble':
      return 'Dribbble'
    case 'medium':
      return 'Medium'
    default:
      return 'Link'
  }
}

/** Strip protocol and trailing slash for compact display of a URL. */
export function prettyUrl(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}
