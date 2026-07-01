'use client'

/**
 * exit-demo.tsx — clears demo mode when the auth pages are visited.
 *
 * Prevents a stale demo flag (from a prior "Try demo" session) from making the
 * fetch interceptor hijack a real authenticated session's API calls.
 */

import { useEffect } from 'react'
import { disableDemoMode } from '@/lib/demo/demo-mode'

export function ExitDemo() {
  useEffect(() => {
    disableDemoMode()
  }, [])
  return null
}
