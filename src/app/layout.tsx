import type { Metadata } from 'next'
import { Rubik } from 'next/font/google'
import { Theme_Manager } from '@/components/theme-manager'
import QueryProvider from '@/components/query-provider'
import './globals.css'

/**
 * Load Rubik as a CSS variable so globals.css can reference it via
 * var(--font-rubik).  The `fallback` array satisfies Req 9.2 — if Rubik
 * fails to load the browser falls through to these system fonts.
 *
 * Requirements: 9.1, 9.2
 */
const rubik = Rubik({
  variable: '--font-rubik',
  subsets: ['latin'],
  display: 'swap',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'Resumify',
  description: 'Build professional resumes with AI — fast.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /*
     * data-theme="light" is the server-side default (Req 9.7).
     * suppressHydrationWarning is required because the inline script below
     * may change the attribute before React hydrates, which would otherwise
     * trigger a hydration mismatch warning.
     *
     * The inline script (Req 9.6) runs synchronously during HTML parsing —
     * before the first paint — and overwrites data-theme with the value
     * stored in localStorage, preventing any theme flash.
     * See: Next.js "Preventing Flash Before Hydration" guide.
     */
    <html
      lang="en"
      className={rubik.variable}
      data-theme="light"
      suppressHydrationWarning
    >
      <head>
        {/* Inline script: reads localStorage['theme'] and sets data-theme
            before first paint.  try/catch guards against environments where
            localStorage is unavailable (e.g. private-browsing restrictions). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t){var p=JSON.parse(t);if(p&&p.state&&p.state.theme)document.documentElement.setAttribute("data-theme",p.state.theme)}}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        {/* Theme_Manager keeps data-theme in sync with Zustand state on
            every subsequent theme change (Req 9.3, 9.4). */}
        <Theme_Manager />
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
