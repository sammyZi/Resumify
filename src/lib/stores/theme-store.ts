/**
 * theme-store.ts — Zustand theme slice.
 *
 * Manages the user's light/dark theme preference and persists it to
 * localStorage under the key 'theme'.  Defaults to 'light' when no stored
 * value is present (Req 9.7).  On return within an active session the last-
 * selected theme is restored (Req 9.6).
 *
 * Requirements: 9.3, 9.4, 9.6, 9.7
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

export interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      setTheme: (theme: Theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
    }),
    {
      name: 'theme',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
