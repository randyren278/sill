import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes'
import { PlantsProvider } from './data/PlantsProvider'
import { localStorageRepo } from './data/localStorageRepo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PlantsProvider repo={localStorageRepo}>
      <RouterProvider router={router} />
    </PlantsProvider>
  </StrictMode>,
)
