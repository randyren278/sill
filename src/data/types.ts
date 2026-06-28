export type ArchKey = 'broad' | 'cane' | 'trail' | 'succ' | 'fan' | 'bush'
export type GreensKey = 'forest' | 'deep' | 'bright' | 'jade'
export type SizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/** One watering record. `daysLate` is omitted when the watering happened
 *  on or before the due date; present (and > 0) only for late waterings. */
export type HistoryEntry = {
  date: string  // 'YYYY-MM-DD'
  daysLate?: number
}

export type Plant = {
  id: string
  name: string
  loc: string
  latin: string
  common: string
  light: string
  freqDays: number
  arch: ArchKey
  greens: GreensKey
  size: SizeKey
  fact: string
  notes: string
  lastWatered: string  // 'YYYY-MM-DD'
  history: HistoryEntry[]  // descending by date
}

export type Species = {
  common: string
  latin: string
  arch: ArchKey
  greens: GreensKey
  size: SizeKey
  light: string
  freq: number
  fact: string
}
