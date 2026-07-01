'use client'

/**
 * query-provider.tsx — TanStack Query client provider.
 *
 * Wraps the application with a stable QueryClient and exposes canonical
 * query key factories so every feature uses consistent cache keys.
 *
 * Requirements: 9.6
 */

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { installDemoFetch } from '@/lib/demo/demo-fetch'

// ─── Canonical query keys ─────────────────────────────────────────────────────

export const queryKeys = {
  profile: () => ['profile'] as const,
  resumes: () => ['resumes'] as const,
  resume: (id: string) => ['resume', id] as const,
  templates: (roleCategory?: string) => ['templates', roleCategory] as const,
  shares: (resumeId: string) => ['shares', resumeId] as const,
}

// ─── Provider ─────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is fresh for 60 seconds before a background refetch is triggered.
        staleTime: 60_000,
        // Only retry once on failure — avoids flooding the network on hard errors.
        retry: 1,
      },
    },
  })
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  // useState ensures a stable QueryClient instance across re-renders without
  // accidentally sharing state between different users/requests on the server.
  // Installing the demo fetch interceptor here guarantees it is active before
  // any page fires its first query.
  const [queryClient] = useState(() => {
    installDemoFetch()
    return makeQueryClient()
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
