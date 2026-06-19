import type { Plant } from '../data/types'
import { MONTHS, TODAY, parse } from './dates'
import { COLORS } from './palette'
import { derive } from './derive'

export type CalendarCell = {
  day: number | ''
  bg: string
  border: string
  numColor: string
  dots: string[]
  iso?: string
  isToday?: boolean
}

export type CalendarMonth = {
  monthLabel: string
  cells: CalendarCell[]
  year: number
  month: number  // 0-11
}

/**
 * Build a Monday-first month grid for `2026-06 + offset` (matching the artifact's anchor).
 * Returns 5–6 rows of 7 cells; empty cells use day=''.
 */
export function buildCalendar(plants: Plant[], offset: number): CalendarMonth {
  const base = new Date(2026, 5 + offset, 1)
  const year = base.getFullYear()
  const month = base.getMonth()
  const monthLabel = MONTHS[month] + ' ' + year
  const daysIn = new Date(year, month + 1, 0).getDate()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7  // Monday-first

  const ev: Record<string, string[]> = {}
  const push = (iso: string, color: string) => {
    if (!ev[iso]) ev[iso] = []
    ev[iso].push(color)
  }
  for (const p of plants) {
    const d = derive(p, true)
    for (const h of p.history) {
      const dt = parse(h)
      if (dt.getFullYear() === year && dt.getMonth() === month) push(h, COLORS.wateredDot)
    }
    const nd = parse(d.nextDue)
    if (nd.getFullYear() === year && nd.getMonth() === month) push(d.nextDue, d.statusColor)
  }

  const cells: CalendarCell[] = []
  for (let i = 0; i < lead; i++) {
    cells.push({ day: '', bg: 'transparent', border: 'none', numColor: 'transparent', dots: [] })
  }
  for (let dnum = 1; dnum <= daysIn; dnum++) {
    const iso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(dnum).padStart(2, '0')
    const isToday = iso === TODAY
    const dots = (ev[iso] ?? []).slice(0, 4)
    cells.push({
      day: dnum,
      bg: isToday ? '#1e3d2f' : (dots.length ? '#f1efe5' : '#fbfaf5'),
      border: isToday ? 'none' : '1px solid #ece9dd',
      numColor: isToday ? '#eef0e4' : '#1b211c',
      dots,
      iso,
      isToday,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: '', bg: 'transparent', border: 'none', numColor: 'transparent', dots: [] })
  }

  return { monthLabel, cells, year, month }
}
