/**
 * Theme_Manager — client component that syncs the Zustand theme state to the
 * <html> element's `data-theme` attribute.
 *
 * Placing this in the root layout ensures every route inherits the correct
 * attribute before any CSS is applied.  The attribute change happens inside
 * useEffect so it only runs in the browser, avoiding SSR/hydration mismatches.
 * The inline script in layout.tsx handles the flash-free initial paint (see
 * Next.js "Preventing Flash Before Hydration" guide).
 *
 * Requirements: 9.3, 9.4, 9.6, 9.7
 */

'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/stores/theme-store'

export function Theme_Manager() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  // Renders nothing — effect-only component.
  return null
}
