import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { colors, radius, type } from '../lib/tokens'

export type SelectOption<V extends string | number> = {
  value: V
  label: string
}

type Props<V extends string | number> = {
  value: V
  onChange: (v: V) => void
  options: SelectOption<V>[]
  placeholder?: string
  /** Optional ARIA label when there is no visible <label> sibling. */
  ariaLabel?: string
}

/**
 * Custom themed dropdown — replaces native <select> so the trigger and the
 * options panel match the rest of the UI (no OS chrome).
 *
 * Keyboard: ArrowUp/Down to move, Enter/Space to commit, Esc to close.
 */
export function Select<V extends string | number>({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
}: Props<V>) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(() => {
    const i = options.findIndex((o) => o.value === value)
    return i < 0 ? 0 : i
  })
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLUListElement | null>(null)
  const listId = useId()

  const current = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  )

  // Close on outside click + Esc.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${activeIdx}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIdx])

  const commit = (i: number) => {
    const opt = options[i]
    if (!opt) return
    onChange(opt.value)
    setOpen(false)
  }

  const onTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      if (e.key === 'ArrowDown') setActiveIdx((i) => Math.min(options.length - 1, i + 1))
      else if (e.key === 'ArrowUp') setActiveIdx((i) => Math.max(0, i - 1))
      else commit(activeIdx)
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        style={{
          width: '100%',
          fontSize: type.body.fontSize,
          padding: '13px 38px 13px 15px',
          borderRadius: radius.input,
          border: `1px solid ${colors.border.DEFAULT}`,
          background: colors.surface.DEFAULT,
          color: current ? colors.ink.primary : colors.ink.faint,
          textAlign: 'left',
          cursor: 'pointer',
          position: 'relative',
          fontFamily: 'inherit',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      >
        {current?.label ?? placeholder ?? ''}
        <Chevron open={open} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-activedescendant={`${listId}-opt-${activeIdx}`}
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 100,
            margin: 0,
            padding: 6,
            listStyle: 'none',
            background: colors.surface.DEFAULT,
            border: `1px solid ${colors.border.DEFAULT}`,
            borderRadius: radius.cardSm,
            boxShadow: `0 14px 34px ${colors.elevation[2]}`,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          {options.map((o, i) => {
            const selected = o.value === value
            const active = i === activeIdx
            return (
              <li
                key={String(o.value)}
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={selected}
                data-idx={i}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault() // keep focus on the trigger
                  commit(i)
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: radius.popoverRow,
                  fontSize: 14,
                  color: selected ? colors.onBrand.fg : colors.ink.primary,
                  background: selected ? colors.brand.DEFAULT : active ? colors.surface.muted : 'transparent',
                  cursor: 'pointer',
                }}
              >
                {o.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
        transition: 'transform .2s',
        color: colors.ink.muted,
      }}
    >
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
