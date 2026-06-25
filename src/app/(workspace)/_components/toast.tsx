'use client'

/**
 * toast.tsx — toast notification component.
 *
 * Reads from the useUIStore toasts array and auto-dismisses each toast after
 * 4 seconds. Fixed bottom-right position.
 *
 * Requirements: 5.5, 5.7, 11.7, 11.8, 11.9
 */

import { useEffect } from 'react'
import { useUIStore, type Toast } from '@/lib/stores/ui-store'

const kindStyles: Record<string, React.CSSProperties> = {
  success: {
    background: '#f0fdf4',
    color: '#166534',
    border: '1px solid #bbf7d0',
  },
  error: {
    background: '#fef2f2',
    color: '#991b1b',
    border: '1px solid #fecaca',
  },
  info: {
    background: '#eff6ff',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useUIStore((s) => s.removeToast)

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        ...kindStyles[toast.kind],
        padding: '0.75rem 1rem',
        borderRadius: '8px',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        minWidth: '18rem',
        maxWidth: '28rem',
        cursor: 'default',
      }}
    >
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          opacity: 0.6,
          fontSize: '1.125rem',
          lineHeight: 1,
          padding: 0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div key={t.id} style={{ pointerEvents: 'auto' }}>
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}
