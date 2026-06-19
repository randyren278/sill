import type { Plant } from './types'

export interface PlantsRepo {
  list(): Promise<Plant[]>
  upsert(plant: Plant): Promise<void>
  remove(id: string): Promise<void>
}
