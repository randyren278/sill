import type { Plant, ArchKey, GreensKey, SizeKey } from './types'
import type { PlantsRepo } from './repo'
import { supabase } from './supabaseClient'

// Database row shape (snake_case, matches the SQL schema in README).
type Row = {
  id: string
  name: string
  loc: string
  latin: string
  common: string
  light: string
  freq_days: number
  arch: ArchKey
  greens: GreensKey
  size: SizeKey
  fact: string
  last_watered: string
  history: string[]
  created_at?: string
}

function rowToPlant(r: Row): Plant {
  return {
    id: r.id,
    name: r.name,
    loc: r.loc,
    latin: r.latin,
    common: r.common,
    light: r.light,
    freqDays: r.freq_days,
    arch: r.arch,
    greens: r.greens,
    size: r.size ?? 'md',
    fact: r.fact,
    lastWatered: r.last_watered,
    history: r.history ?? [],
  }
}

function plantToRow(p: Plant): Row {
  return {
    id: p.id,
    name: p.name,
    loc: p.loc,
    latin: p.latin,
    common: p.common,
    light: p.light,
    freq_days: p.freqDays,
    arch: p.arch,
    greens: p.greens,
    size: p.size,
    fact: p.fact,
    last_watered: p.lastWatered,
    history: p.history,
  }
}

export const supabasePlantsRepo: PlantsRepo = {
  async list() {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data as Row[]).map(rowToPlant)
  },

  async upsert(plant) {
    const { error } = await supabase
      .from('plants')
      .upsert(plantToRow(plant), { onConflict: 'id' })
    if (error) throw error
  },

  async remove(id) {
    const { error } = await supabase.from('plants').delete().eq('id', id)
    if (error) throw error
  },
}
