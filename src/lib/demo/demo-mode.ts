'use client'

/**
 * demo-mode.ts — client-side demo mode flag.
 *
 * Demo mode is stored in localStorage so it persists across reloads and is
 * readable synchronously by the fetch interceptor. No server involvement.
 */

const KEY = 'resumify-demo-mode'

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function enableDemoMode(): void {
  try {
    window.localStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

export function disableDemoMode(): void {
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
