import type { Plant, HistoryEntry, ArchKey, GreensKey, SizeKey } from './types'
import type { PlantsRepo } from './repo'
import { supabase } from './supabaseClient'
import { getOwnerKey, OwnerKeyMissingError } from '../lib/owner'

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
  notes?: string
  last_watered: string
  history: unknown[]   // tolerate legacy string[] during the migration window
  created_at?: string
}

/** Tolerates legacy string history entries during the migration deploy window. */
function normalizeHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((e): HistoryEntry | null => {
      if (typeof e === 'string') return { date: e }
      if (e && typeof e === 'object' && typeof (e as { date?: unknown }).date === 'string') {
        const obj = e as { date: string; daysLate?: unknown }
        const daysLate = typeof obj.daysLate === 'number' && obj.daysLate > 0 ? obj.daysLate : undefined
        return daysLate !== undefined ? { date: obj.date, daysLate } : { date: obj.date }
      }
      return null
    })
    .filter((e): e is HistoryEntry => e !== null)
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
    notes: r.notes ?? '',
    lastWatered: r.last_watered,
    history: normalizeHistory(r.history),
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
    notes: p.notes,
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
    const key = getOwnerKey()
    if (!key) throw new OwnerKeyMissingError()
    const { error } = await supabase.rpc('plant_upsert', {
      p_key: key,
      p_plant: plantToRow(plant),
    })
    if (error) throw error
  },

  async remove(id) {
    const key = getOwnerKey()
    if (!key) throw new OwnerKeyMissingError()
    const { error } = await supabase.rpc('plant_remove', { p_key: key, p_id: id })
    if (error) throw error
  },
}
