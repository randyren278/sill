import { useEffect, useRef, useState } from 'react'
import type { Plant } from '../data/types'
import { colors, radius, type } from '../lib/tokens'

type Props = {
  plant: Plant
  onSave: (notes: string) => Promise<void>
}

/**
 * Free-form notes per plant. Debounced auto-save (800ms after the last
 * keystroke) + flush on blur. Tracks a `saved` indicator so the user knows
 * whether their last edit landed.
 */
export function NotesCard({ plant, onSave }: Props) {
  const [value, setValue] = useState(plant.notes)
  const [savedAt, setSavedAt] = useState<number | null>(plant.notes ? Date.now() : null)
  const timerRef = useRef<number | null>(null)
  const inflightRef = useRef<string | null>(null)
  const remoteRef = useRef(plant.notes)

  // If the plant updates from elsewhere (e.g. another tab) and the user
  // hasn't typed since, reflect the new value.
  useEffect(() => {
    if (plant.notes !== remoteRef.current && plant.notes !== value && !timerRef.current) {
      setValue(plant.notes)
    }
    remoteRef.current = plant.notes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plant.notes])

  const flush = async (text: string) => {
    if (text === remoteRef.current || inflightRef.current === text) return
    inflightRef.current = text
    try {
      await onSave(text)
      remoteRef.current = text
      setSavedAt(Date.now())
    } finally {
      inflightRef.current = null
    }
  }

  const onChange = (next: string) => {
    setValue(next)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      flush(next)
    }, 800)
  }

  const onBlur = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    flush(value)
  }

  const status = (() => {
    if (timerRef.current) return 'saving…'
    if (!savedAt) return ''
    return 'saved'
  })()

  return (
    <div
      style={{
        background: colors.surface.DEFAULT,
        border: `1px solid ${colors.border.DEFAULT}`,
        borderRadius: 18,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: type.eyebrow.fontFamily,
            fontSize: type.eyebrow.fontSize,
            letterSpacing: type.eyebrow.letterSpacing,
            textTransform: type.eyebrow.textTransform,
            color: colors.ink.muted,
          }}
        >
          Notes
        </div>
        {status && (
          <span style={{ fontSize: 11, color: colors.ink.faint, fontFamily: 'ui-monospace, monospace' }}>
            {status}
          </span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Add what you've noticed about this plant — light quirks, repotting dates, anything worth remembering…"
        rows={5}
        style={{
          width: '100%',
          resize: 'vertical',
          minHeight: 96,
          fontFamily: type.body.fontFamily,
          fontSize: type.body.fontSize,
          lineHeight: 1.5,
          color: colors.ink.primary,
          background: colors.canvas,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: radius.input,
          padding: '12px 14px',
          outline: 'none',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      />
    </div>
  )
}
