import { useEffect, useRef, useState } from 'react'
import { MONTHS, TODAY, iso, parse } from '../lib/dates'
import { colors, radius, type } from '../lib/tokens'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type Props = {
  value: string            // 'YYYY-MM-DD'
  onChange: (v: string) => void
  ariaLabel?: string
}

/**
 * Custom themed date picker. Trigger button shows "20 Jun 2026"; click opens
 * a calendar dropdown matching the app's Calendar screen styling.
 */
export function DatePicker({ value, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // The month being viewed (independent of selected day so users can navigate freely).
  const initial = value ? parse(value) : parse(TODAY)
  const [viewYear, setViewYear] = useState(initial.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial.getMonth())

  // Re-anchor view when external value flips significantly (e.g. user clicks Cancel and reopens).
  useEffect(() => {
    if (!value) return
    const d = parse(value)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }, [value])

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

  const daysIn = new Date(viewYear, viewMonth + 1, 0).getDate()
  const lead = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7  // Mon-first
  const cells: ({ day: number; iso: string } | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysIn; d++) {
    cells.push({ day: d, iso: iso(new Date(viewYear, viewMonth, d)) })
  }
  while (cells.length % 7 !== 0) cells.push(null)

  const triggerLabel = (() => {
    if (!value) return 'Pick a date'
    const d = parse(value)
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear()
  })()

  const stepMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    while (m < 0) { m += 12; y -= 1 }
    while (m > 11) { m -= 12; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%',
          fontSize: type.body.fontSize,
          padding: '13px 38px 13px 15px',
          borderRadius: radius.input,
          border: `1px solid ${colors.border.DEFAULT}`,
          background: colors.surface.DEFAULT,
          color: value ? colors.ink.primary : colors.ink.faint,
          textAlign: 'left',
          cursor: 'pointer',
          position: 'relative',
          fontFamily: 'inherit',
          transition: 'border-color .2s, box-shadow .2s',
        }}
      >
        {triggerLabel}
        <CalendarIcon />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Pick a date"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 100,
            background: colors.surface.DEFAULT,
            border: `1px solid ${colors.border.DEFAULT}`,
            borderRadius: radius.cardSm,
            boxShadow: `0 14px 34px ${colors.elevation[2]}`,
            padding: 14,
            width: 280,
          }}
        >
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <NavBtn onClick={() => stepMonth(-1)} aria-label="Previous month">‹</NavBtn>
            <div style={{ fontFamily: type.sectionTitle.fontFamily, fontSize: 18, color: colors.ink.primary }}>
              {MONTHS[viewMonth]} {viewYear}
            </div>
            <NavBtn onClick={() => stepMonth(1)} aria-label="Next month">›</NavBtn>
          </div>
          {/* Weekday labels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontFamily: type.eyebrow.fontFamily,
                  fontSize: 9.5,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: colors.ink.faint,
                  padding: '4px 0',
                }}
              >
                {w}
              </div>
            ))}
          </div>
          {/* Day grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((c, i) => {
              if (!c) return <div key={i} />
              const selected = c.iso === value
              const isToday = c.iso === TODAY
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onChange(c.iso); setOpen(false) }}
                  style={{
                    aspectRatio: '1',
                    borderRadius: radius.popoverRow,
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    background: selected ? colors.brand.DEFAULT : isToday ? colors.surface.lo : 'transparent',
                    color: selected ? colors.onBrand.fg : colors.ink.primary,
                    fontWeight: selected || isToday ? 700 : 500,
                    transition: 'background .15s',
                  }}
                >
                  {c.day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, children, ...rest }: { onClick: () => void; children: React.ReactNode; 'aria-label'?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      {...rest}
      style={{
        width: 30,
        height: 30,
        borderRadius: radius.pill,
        border: `1px solid ${colors.border.DEFAULT}`,
        background: colors.surface.DEFAULT,
        cursor: 'pointer',
        fontSize: 14,
        color: colors.ink.primary,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function CalendarIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      style={{
        position: 'absolute',
        right: 14,
        top: '50%',
        transform: 'translateY(-50%)',
        color: colors.ink.muted,
      }}
    >
      <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1.5" y1="5.5" x2="12.5" y2="5.5" stroke="currentColor" strokeWidth="1.2" />
      <line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9.5" y1="1" x2="9.5" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
