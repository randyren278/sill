import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Plant } from './types'
import type { PlantsRepo } from './repo'
import { TODAY } from '../lib/dates'
import { supabaseConfigError } from './supabaseClient'

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
  const [error, setError] = useState<string | null>(supabaseConfigError)

  useEffect(() => {
    if (supabaseConfigError) {
      setLoading(false)
      return
    }
    let cancelled = false
    repo
      .list()
      .then((list) => {
        if (!cancelled) {
          setPlants(list)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('PlantsRepo.list failed:', err)
          setError(err?.message ?? String(err))
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

  if (error) return <SetupError message={error} />

  return (
    <PlantsContext.Provider value={{ plants, loading, water, upsert, remove }}>
      {children}
    </PlantsContext.Provider>
  )
}

function SetupError({ message }: { message: string }) {
  return (
    <div
      style={{
        maxWidth: 640,
        margin: '64px auto',
        padding: '0 24px',
        fontFamily: "'Hanken Grotesk', sans-serif",
        color: '#1b211c',
      }}
    >
      <div
        style={{
          fontFamily: "'Newsreader', serif",
          fontSize: 32,
          letterSpacing: '-.01em',
          marginBottom: 16,
        }}
      >
        Setup needed
      </div>
      <div
        style={{
          background: '#fbfaf5',
          border: '1px solid #e6e3d7',
          borderRadius: 16,
          padding: '20px 22px',
          fontSize: 14,
          lineHeight: 1.55,
          whiteSpace: 'pre-wrap',
          color: '#5a5f53',
        }}
      >
        {message}
      </div>
      <div style={{ fontSize: 13, color: '#6b736a', marginTop: 14, lineHeight: 1.55 }}>
        Open the browser console for the full error. See <code>README.md</code> for the SQL schema and{' '}
        <code>.env.local</code> setup.
      </div>
    </div>
  )
}
