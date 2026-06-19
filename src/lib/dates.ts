// TODAY is hard-coded by design. The default plants in lib/defaults.ts are
// calibrated to this date so the first impression matches the artifact.
// Switching to live time would also require regenerating defaultPlants offsets.
export const TODAY = '2026-06-19'

export const MS = 86400000
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parse(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function iso(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function addDays(s: string, n: number): string {
  const d = parse(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function diff(a: string, b: string): number {
  return Math.round((parse(a).getTime() - parse(b).getTime()) / MS)
}

export function fmt(s: string): string {
  const d = parse(s)
  return d.getDate() + ' ' + MONTHS[d.getMonth()]
}
