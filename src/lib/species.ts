import type { Species } from '../data/types'

export const SPECIES: Species[] = [
  { common: 'Monstera',    latin: 'Monstera deliciosa', arch: 'broad', greens: 'forest', size: 'md', light: 'Bright indirect', freq: 7,  fact: 'The holes in its leaves — fenestrations — let light and rain reach the leaves below.' },
  { common: 'Dracaena',    latin: 'Dracaena fragrans',  arch: 'cane',  greens: 'deep',   size: 'md', light: 'Low–medium',      freq: 11, fact: 'Nicknamed the corn plant for its thick cane stalks and long arching leaves.' },
  { common: 'Pothos',      latin: 'Epipremnum aureum',  arch: 'trail', greens: 'forest', size: 'md', light: 'Low light OK',    freq: 7,  fact: 'Nearly unkillable — its vines can grow over 12 metres long indoors.' },
  { common: 'Jade',        latin: 'Crassula ovata',     arch: 'succ',  greens: 'jade',   size: 'md', light: 'Bright direct',   freq: 21, fact: 'A succulent that stores water in its plump leaves — long seen as a symbol of prosperity.' },
  { common: 'Strelitzia',  latin: 'Strelitzia reginae', arch: 'fan',   greens: 'bright', size: 'md', light: 'Bright direct',   freq: 7,  fact: 'Its flower mimics a tropical bird to lure sunbirds in to pollinate it.' },
  { common: 'Other plant', latin: 'Houseplant',         arch: 'broad', greens: 'forest', size: 'md', light: 'Bright indirect', freq: 7,  fact: 'Keep your own care notes for this one as you learn its rhythm.' },
]

export const LIGHT_OPTIONS = ['Bright direct', 'Bright indirect', 'Medium', 'Low–medium', 'Low light OK'] as const

export const SIZE_OPTIONS: { value: import('../data/types').SizeKey; label: string }[] = [
  { value: 'xs', label: 'Tiny' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Huge' },
]
