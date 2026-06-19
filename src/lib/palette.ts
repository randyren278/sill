import type { GreensKey } from '../data/types'

export const greenSets: Record<GreensKey, { D: string; G: string; L: string; H: string }> = {
  forest: { D: '#1c3a2c', G: '#3f6b4a', L: '#76995f', H: '#b6cf90' },
  deep:   { D: '#173024', G: '#345a3f', L: '#5f8a53', H: '#9cc080' },
  bright: { D: '#26452f', G: '#4a7a4f', L: '#86a85f', H: '#c3d893' },
  jade:   { D: '#2a4636', G: '#4c7158', L: '#83a06f', H: '#bcd29a' },
}

// Status colors used across status dot, meter, big number, calendar dots.
export const COLORS = {
  overdue: '#b5613a',
  overdueDot: '#d98a5b',
  dueSoon: '#b8862f',
  dueSoonDot: '#d8ab4a',
  happy: '#3f6b4a',
  happyDot: '#7fae6a',
  wateredDot: '#9bb98a',
} as const
