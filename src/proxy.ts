/**
 * proxy.ts — Session refresh proxy (Next.js 16+, replaces middleware.ts)
 *
 * Supabase @supabase/ssr sets session cookies in route handlers via setAll,
 * but Server Components cannot write cookies themselves. This proxy runs
 * before every page/route and refreshes the session token so that subsequent
 * server-side calls to supabase.auth.getUser() see a valid session.
 *
 * Without this, logging in sets the cookie in the POST /auth/login response,
 * but the redirect to "/" renders RootPage on the server with no visible
 * session, causing an immediate redirect back to /login.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env.public'

export async function proxy(request: NextRequest) {
  // Start with a passthrough response; setAll below may replace it.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write updated tokens onto the forwarded request so downstream
          // server code picks them up, then onto the response so the browser
          // stores the refreshed tokens.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Calling getUser() causes @supabase/ssr to validate and refresh the access
  // token, writing the updated cookies via setAll above.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    /*
     * Run on all paths except static assets and metadata files.
     * Note: Next.js always invokes proxy for _next/data routes even when
     * excluded — this is intentional to prevent accidental auth gaps.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|ico|webp)$).*)',
  ],
}
