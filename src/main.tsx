import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes'
import { PlantsProvider } from './data/PlantsProvider'
import { supabasePlantsRepo } from './data/supabasePlantsRepo'
import { ToastProvider } from './components/Toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <PlantsProvider repo={supabasePlantsRepo}>
        <RouterProvider router={router} />
      </PlantsProvider>
    </ToastProvider>
  </StrictMode>,
)
