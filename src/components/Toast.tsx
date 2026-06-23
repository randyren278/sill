import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { colors, radius, type } from '../lib/tokens'

type ToastInput = {
  message: string
  actionLabel?: string
  onAction?: () => void
  durationMs?: number
}

type ToastState = ToastInput & { id: number }

type Ctx = {
  show: (t: ToastInput) => void
  dismiss: () => void
}

const ToastContext = createContext<Ctx | null>(null)

export function useToast(): Ctx {
  const c = useContext(ToastContext)
  if (!c) throw new Error('useToast must be used inside <ToastProvider>')
  return c
}

/**
 * Single-toast-at-a-time queue. Mounting a new toast cancels the prior one's
 * timer and replaces it. Portal-mounted to body (same escape hatch as
 * ConfirmDialog).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timerRef = useRef<number | null>(null)
  const idRef = useRef(0)

  const dismiss = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setToast(null)
  }, [])

  const show = useCallback((t: ToastInput) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    idRef.current += 1
    const id = idRef.current
    setToast({ ...t, id })
    timerRef.current = window.setTimeout(() => {
      setToast((cur) => (cur?.id === id ? null : cur))
      timerRef.current = null
    }, t.durationMs ?? 5000)
  }, [])

  useEffect(() => {
    if (!toast) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toast, dismiss])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      {toast &&
        createPortal(
          <ToastView
            toast={toast}
            onAction={() => {
              toast.onAction?.()
              dismiss()
            }}
            onClose={dismiss}
          />,
          document.body,
        )}
    </ToastContext.Provider>
  )
}

function ToastView({
  toast,
  onAction,
  onClose,
}: {
  toast: ToastState
  onAction: () => void
  onClose: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="sill-toast"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0) + 24px)',
        left: 'max(env(safe-area-inset-left, 0px), 16px)',
        right: 'max(env(safe-area-inset-right, 0px), 16px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          maxWidth: 520,
          width: '100%',
          background: colors.surface.DEFAULT,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: radius.cardSm,
          padding: '12px 14px 12px 18px',
          boxShadow: '0 18px 44px rgba(27,33,28,.16)',
          color: colors.ink.primary,
          fontFamily: type.body.fontFamily,
          fontSize: type.body.fontSize,
          lineHeight: 1.4,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>{toast.message}</div>
        {toast.actionLabel && toast.onAction && (
          <button
            type="button"
            onClick={onAction}
            style={{
              flex: 'none',
              border: 'none',
              background: 'transparent',
              color: colors.brand.DEFAULT,
              fontFamily: type.body.fontFamily,
              fontWeight: type.weight.semibold,
              fontSize: type.actionLabel.fontSize,
              cursor: 'pointer',
              padding: '11px 14px',
              minHeight: 44,
              borderRadius: radius.pill,
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          style={{
            flex: 'none',
            border: 'none',
            background: 'transparent',
            color: colors.ink.muted,
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            width: 32,
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ×
        </button>
      </div>
    </div>
  )
}
