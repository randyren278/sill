import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Plant } from './types'
import type { PlantsRepo } from './repo'
import { TODAY } from '../lib/dates'

type Ctx = {
  plants: Plant[]
  loading: boolean
  water: (id: string) => Promise<void>
  upsert: (plant: Plant) => Promise<void>
  remove: (id: string) => Promise<void>
}

const PlantsContext = createContext<Ctx | null>(null)

export function usePlants(): Ctx {
  const c = useContext(PlantsContext)
  if (!c) throw new Error('usePlants must be used inside <PlantsProvider>')
  return c
}

export function PlantsProvider({ repo, children }: { repo: PlantsRepo; children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    repo.list().then((list) => {
      if (!cancelled) {
        setPlants(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [repo])

  const upsert = useCallback(
    async (plant: Plant) => {
      await repo.upsert(plant)
      setPlants((prev) => {
        const idx = prev.findIndex((p) => p.id === plant.id)
        return idx >= 0 ? prev.map((p) => (p.id === plant.id ? plant : p)) : [...prev, plant]
      })
    },
    [repo],
  )

  const remove = useCallback(
    async (id: string) => {
      await repo.remove(id)
      setPlants((prev) => prev.filter((p) => p.id !== id))
    },
    [repo],
  )

  const water = useCallback(
    async (id: string) => {
      const current = plants.find((p) => p.id === id)
      if (!current) return
      const history = current.history.includes(TODAY) ? current.history : [TODAY, ...current.history]
      const next: Plant = { ...current, lastWatered: TODAY, history }
      await upsert(next)
    },
    [plants, upsert],
  )

  return (
    <PlantsContext.Provider value={{ plants, loading, water, upsert, remove }}>
      {children}
    </PlantsContext.Provider>
  )
}
