import type { Plant } from '../data/types'
import { TODAY, addDays, diff, fmt } from './dates'
import { COLORS } from './palette'
import { bg, icon } from './sprites'

export type DerivedHistoryEntry = {
  iso: string
  dateFmt: string
  ago: string
  color: string
  ring: string
}

export type DerivedPlant = Plant & {
  since: number
  nextIn: number
  nextDue: string
  overdue: boolean
  statusColor: string
  statusLabel: string
  bigNum: number
  bigSub: string
  statusLine: string
  dotColor: string
  /** raw progress 0..118 (can exceed 100 when overdue) */
  progress: number
  /** width to render right now (0 when not yet revealed, then progress) */
  meterWidth: number
  freqLabel: string
  lastWateredAgo: string
  nextDueFmt: string
  iconUrl: string
  iconBg: string
  history: string[]
  historyDerived: DerivedHistoryEntry[]
}

export function derive(p: Plant, revealed: boolean): DerivedPlant {
  const since = diff(TODAY, p.lastWatered)
  const nextDue = addDays(p.lastWatered, p.freqDays)
  const nextIn = diff(nextDue, TODAY)

  let statusColor: string
  let statusLabel: string
  let bigNum: number
  let bigSub: string
  let statusLine: string
  let dotColor: string
  const overdue = nextIn <= 0

  if (nextIn < 0) {
    statusColor = COLORS.overdue
    dotColor = COLORS.overdueDot
    statusLabel = Math.abs(nextIn) + 'd overdue'
    bigNum = Math.abs(nextIn)
    bigSub = 'days overdue'
    statusLine = 'Needs water now'
  } else if (nextIn === 0) {
    statusColor = COLORS.overdue
    dotColor = COLORS.overdueDot
    statusLabel = 'Water today'
    bigNum = 0
    bigSub = 'water today'
    statusLine = 'Water today'
  } else if (nextIn <= 2) {
    statusColor = COLORS.dueSoon
    dotColor = COLORS.dueSoonDot
    statusLabel = 'In ' + nextIn + 'd'
    bigNum = nextIn
    bigSub = 'days to water'
    statusLine = 'Due soon'
  } else {
    statusColor = COLORS.happy
    dotColor = COLORS.happyDot
    statusLabel = 'Happy'
    bigNum = nextIn
    bigSub = 'days to water'
    statusLine = 'Looking healthy'
  }

  const progress = Math.min(118, Math.round((since / p.freqDays) * 100))

  const historyDerived: DerivedHistoryEntry[] = p.history
    .slice()
    .sort()
    .reverse()
    .slice(0, 5)
    .map((h) => {
      const a = diff(TODAY, h)
      return {
        iso: h,
        dateFmt: fmt(h),
        ago: a === 0 ? 'today' : a + 'd ago',
        color: COLORS.happyDot,
        ring: 'rgba(127,174,106,.18)',
      }
    })

  return {
    ...p,
    since,
    nextIn,
    nextDue,
    overdue,
    statusColor,
    statusLabel,
    bigNum,
    bigSub,
    statusLine,
    dotColor,
    progress,
    meterWidth: revealed ? progress : 0,
    freqLabel: 'Every ' + p.freqDays + ' days',
    lastWateredAgo: since === 0 ? 'today' : since + ' days ago',
    nextDueFmt: fmt(nextDue),
    iconUrl: icon(p.arch, p.greens, p.size),
    iconBg: bg(p.arch, p.greens, p.size),
    historyDerived,
  }
}
