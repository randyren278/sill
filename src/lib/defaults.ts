import type { Plant } from '../data/types'

type Seed = {
  id: string
  name: string
  loc: string
  latin: string
  common: string
  light: string
  freqDays: number
  arch: Plant['arch']
  greens: Plant['greens']
  /** days since last watered, anchored at TODAY = 2026-06-19 */
  since: number
  fact: string
}

const SEEDS: Seed[] = [
  { id: 'p1', name: 'Monstera',   loc: 'living room', latin: 'Monstera deliciosa', common: 'Swiss cheese plant', light: 'Bright indirect', freqDays: 7,  arch: 'broad', greens: 'forest', since: 3,  fact: 'The holes in its leaves — fenestrations — let light and rain reach the leaves below.' },
  { id: 'p2', name: 'Dracaena',   loc: 'bedroom',     latin: 'Dracaena fragrans',  common: 'Corn plant',         light: 'Low–medium',      freqDays: 11, arch: 'cane',  greens: 'deep',   since: 9,  fact: 'Nicknamed the corn plant for its thick cane stalks and long arching leaves.' },
  { id: 'p3', name: 'Monstera',   loc: 'hallway',     latin: 'Monstera deliciosa', common: 'Swiss cheese plant', light: 'Medium',          freqDays: 7,  arch: 'broad', greens: 'bright', since: 8,  fact: 'In the wild it climbs trees, anchoring itself with thick aerial roots.' },
  { id: 'p4', name: 'Pothos',     loc: 'shelf',       latin: 'Epipremnum aureum',  common: 'Devil’s ivy',        light: 'Low light OK',    freqDays: 7,  arch: 'trail', greens: 'forest', since: 1,  fact: 'Nearly unkillable — its vines can grow over 12 metres long indoors.' },
  { id: 'p5', name: 'Jade',       loc: 'windowsill',  latin: 'Crassula ovata',     common: 'Jade plant',         light: 'Bright direct',   freqDays: 21, arch: 'succ',  greens: 'jade',   since: 12, fact: 'A succulent that stores water in its plump leaves — long seen as a symbol of prosperity.' },
  { id: 'p6', name: 'Strelitzia', loc: 'corner',      latin: 'Strelitzia reginae', common: 'Bird of paradise',   light: 'Bright direct',   freqDays: 7,  arch: 'fan',   greens: 'bright', since: 5,  fact: 'Its flower mimics a tropical bird to lure sunbirds in to pollinate it.' },
]

function dateOffset(daysAgo: number): string {
  const d = new Date(2026, 5, 19)
  d.setDate(d.getDate() - daysAgo)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

export function defaultPlants(): Plant[] {
  return SEEDS.map((s) => {
    const lastWatered = dateOffset(s.since)
    const history: string[] = []
    for (let i = 0; i < 4; i++) history.push(dateOffset(s.since + i * s.freqDays))
    return {
      id: s.id,
      name: s.name,
      loc: s.loc,
      latin: s.latin,
      common: s.common,
      light: s.light,
      freqDays: s.freqDays,
      arch: s.arch,
      greens: s.greens,
      fact: s.fact,
      lastWatered,
      history,
    }
  })
}
