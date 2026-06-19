import type { Plant } from './types'
import type { PlantsRepo } from './repo'
import { defaultPlants } from '../lib/defaults'

const KEY = 'sill.plants.v2'

function read(): Plant[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Plant[]
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch {
    return null
  }
}

function write(plants: Plant[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(plants))
  } catch {
    // localStorage full / disabled — best effort
  }
}

export const localStorageRepo: PlantsRepo = {
  async list() {
    return read() ?? defaultPlants()
  },
  async upsert(plant) {
    const current = read() ?? defaultPlants()
    const idx = current.findIndex((p) => p.id === plant.id)
    const next = idx >= 0
      ? current.map((p) => (p.id === plant.id ? plant : p))
      : [...current, plant]
    write(next)
  },
  async remove(id) {
    const current = read() ?? defaultPlants()
    write(current.filter((p) => p.id !== id))
  },
}
