'use client'

/**
 * demo/page.tsx — entry point for demo mode.
 *
 * Enables demo mode (data stored locally in IndexedDB) and forwards to the real
 * dashboard. From there the entire app behaves identically to a signed-in
 * session, except all data lives in the browser.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { enableDemoMode } from '@/lib/demo/demo-mode'

export default function DemoEntryPage() {
  const router = useRouter()

  useEffect(() => {
    enableDemoMode()
    router.replace('/resumes')
  }, [router])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--color-text-secondary)' }}>
      Starting demo…
    </div>
  )
}
