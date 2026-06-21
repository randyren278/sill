import { useEffect, useId, useRef } from 'react'
import { button, colors, radius, type } from '../lib/tokens'

type Props = {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(243,241,233,.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 1000,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface.DEFAULT,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: radius.cardLg,
          padding: '26px 28px 22px',
          maxWidth: 380,
          width: '100%',
          boxShadow: '0 24px 60px rgba(27,33,28,.18)',
        }}
      >
        <div
          id={titleId}
          style={{
            fontFamily: type.sectionTitle.fontFamily,
            fontSize: 24,
            lineHeight: 1.15,
            letterSpacing: '-.005em',
            color: colors.ink.primary,
            marginBottom: body ? 8 : 18,
          }}
        >
          {title}
        </div>
        {body && (
          <div
            style={{
              fontFamily: type.body.fontFamily,
              fontSize: type.body.fontSize,
              lineHeight: 1.5,
              color: colors.ink.muted,
              marginBottom: 22,
            }}
          >
            {body}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            style={{
              border: button.ghostOutline.border,
              cursor: 'pointer',
              background: button.ghostOutline.background,
              color: button.ghostOutline.color,
              fontWeight: type.weight.semibold,
              fontSize: button.ghostOutline.fontSize,
              padding: button.ghostOutline.padding,
              borderRadius: radius.pill,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              border: 'none',
              cursor: 'pointer',
              background: destructive ? colors.status.overdue : button.primary.background,
              color: button.primary.color,
              fontWeight: type.weight.semibold,
              fontSize: button.primary.fontSize,
              padding: button.primary.padding,
              borderRadius: radius.pill,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
