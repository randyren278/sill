import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes'
import { PlantsProvider } from './data/PlantsProvider'
import { supabasePlantsRepo } from './data/supabasePlantsRepo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlantsProvider repo={supabasePlantsRepo}>
      <RouterProvider router={router} />
    </PlantsProvider>
  </StrictMode>,
)
