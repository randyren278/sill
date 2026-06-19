export type ArchKey = 'broad' | 'cane' | 'trail' | 'succ' | 'fan'
export type GreensKey = 'forest' | 'deep' | 'bright' | 'jade'

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
  fact: string
  lastWatered: string  // 'YYYY-MM-DD'
  history: string[]    // 'YYYY-MM-DD' descending
}

export type Species = {
  common: string
  latin: string
  arch: ArchKey
  greens: GreensKey
  light: string
  freq: number
  fact: string
}
