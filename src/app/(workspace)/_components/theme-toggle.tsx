'use client'

/**
 * theme-toggle.tsx — animated light/dark toggle.
 *
 * On click a small 3D cube flies from the button to a random point, and where
 * it lands a circular View Transition reveals the new theme. Falls back to an
 * instant switch when View Transitions or motion are unavailable.
 *
 * Integrates with the app's theming: it flips the Zustand theme store and sets
 * the <html data-theme> attribute synchronously inside the transition callback
 * (Theme_Manager keeps them in sync afterwards).
 */

import { useEffect, useRef, useState } from 'react'
import { useThemeStore } from '@/lib/stores/theme-store'
import styles from './workspace-ui.module.css'

// ─── imperative cube flyout ────────────────────────────────────────────────

function spawnCube(
  startX: number,
  startY: number,
  enteringDark: boolean,
  onLand: (x: number, y: number) => void
) {
  const cube = document.createElement('div')

  const destX = window.innerWidth * (0.2 + Math.random() * 0.6)
  const destY = window.innerHeight * (0.2 + Math.random() * 0.6)
  const dx = destX - startX
  const dy = destY - startY
  const dist = Math.hypot(dx, dy)
  const duration = 320 + dist * 0.22

  const faceColor = enteringDark ? 'rgba(14,35,83,0.92)' : 'rgba(99,132,255,0.92)'
  const edgeColor = enteringDark ? 'rgba(125,164,255,0.55)' : 'rgba(255,255,255,0.55)'
  const size = 28

  cube.style.cssText = `
    position: fixed;
    z-index: 99999;
    width: ${size}px;
    height: ${size}px;
    left: ${startX - size / 2}px;
    top: ${startY - size / 2}px;
    pointer-events: none;
    transform-style: preserve-3d;
    perspective: 400px;
    will-change: transform, opacity;
  `

  const faceStyles = [
    `position:absolute;width:100%;height:100%;background:${faceColor};border:1.5px solid ${edgeColor};transform:translateZ(${size / 2}px);`,
    `position:absolute;width:100%;height:100%;background:${faceColor};border:1.5px solid ${edgeColor};transform:rotateY(180deg) translateZ(${size / 2}px);`,
    `position:absolute;width:${size}px;height:100%;background:${faceColor};border:1.5px solid ${edgeColor};transform:rotateY(-90deg) translateZ(${size / 2}px);`,
    `position:absolute;width:${size}px;height:100%;background:${faceColor};border:1.5px solid ${edgeColor};transform:rotateY(90deg) translateZ(${size / 2}px);`,
    `position:absolute;width:100%;height:${size}px;background:${faceColor};border:1.5px solid ${edgeColor};transform:rotateX(90deg) translateZ(${size / 2}px);`,
    `position:absolute;width:100%;height:${size}px;background:${faceColor};border:1.5px solid ${edgeColor};transform:rotateX(-90deg) translateZ(${size / 2}px);`,
  ]

  faceStyles.forEach((s) => {
    const face = document.createElement('div')
    face.style.cssText = s
    cube.appendChild(face)
  })

  document.body.appendChild(cube)

  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min((now - start) / duration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
    const curX = startX + dx * eased - size / 2
    const curY = startY + dy * eased - size / 2
    const rotX = eased * 540
    const rotY = eased * 360
    const scale = t < 0.5 ? 1 + t * 0.8 : 1.4 - (t - 0.5) * 0.8
    const opacity = t > 0.78 ? 1 - (t - 0.78) / 0.22 : 1

    cube.style.left = `${curX}px`
    cube.style.top = `${curY}px`
    cube.style.opacity = String(opacity)
    cube.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`

    if (t < 1) {
      requestAnimationFrame(tick)
    } else {
      cube.remove()
      onLand(destX, destY)
    }
  }
  requestAnimationFrame(tick)
}

// ─── icons ──────────────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ─── component ────────────────────────────────────────────────────────────────

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void> }
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useThemeStore()
  const [mounted, setMounted] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  const dark = theme === 'dark'

  const toggle = () => {
    const nextTheme: 'light' | 'dark' = dark ? 'light' : 'dark'
    const enteringDark = nextTheme === 'dark'
    const root = document.documentElement

    const applyTheme = () => {
      // Apply synchronously so the View Transition captures the new theme,
      // and update the store so React state stays in sync (and persists).
      root.setAttribute('data-theme', nextTheme)
      setTheme(nextTheme)
    }

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const startViewTransition = (document as ViewTransitionDocument).startViewTransition?.bind(
      document
    )

    if (!btnRef.current || reduceMotion) {
      applyTheme()
      return
    }

    const rect = btnRef.current.getBoundingClientRect()
    const originX = rect.left + rect.width / 2
    const originY = rect.top + rect.height / 2

    spawnCube(originX, originY, enteringDark, (landX, landY) => {
      if (!startViewTransition) {
        applyTheme()
        return
      }

      const endRadius = Math.hypot(
        Math.max(landX, window.innerWidth - landX),
        Math.max(landY, window.innerHeight - landY)
      )

      const transition = startViewTransition(() => {
        applyTheme()
      })

      transition.ready.then(() => {
        root.animate(
          [
            { clipPath: `circle(0px at ${landX}px ${landY}px)`, opacity: 0.9, filter: 'blur(8px)', offset: 0 },
            { clipPath: `circle(${endRadius * 0.25}px at ${landX}px ${landY}px)`, opacity: 1, filter: 'blur(2px)', offset: 0.28 },
            { clipPath: `circle(${endRadius * 0.62}px at ${landX}px ${landY}px)`, opacity: 1, filter: 'blur(0px)', offset: 0.68 },
            { clipPath: `circle(${endRadius}px at ${landX}px ${landY}px)`, opacity: 1, filter: 'blur(0px)', offset: 1 },
          ],
          {
            duration: 600,
            easing: 'linear',
            pseudoElement: '::view-transition-new(root)',
          }
        )
      })
    })
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className={`${styles.themeButton} ${className}`}
      onClick={toggle}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {mounted && dark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
