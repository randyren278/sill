import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { Dashboard } from './screens/Dashboard'
import { PlantDetail } from './screens/PlantDetail'
import { PlantForm } from './screens/PlantForm'
import { Calendar } from './screens/Calendar'
import { Subscribe } from './screens/Subscribe'
import { Unsubscribed } from './screens/Unsubscribed'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'plants/new', element: <PlantForm mode="new" /> },
      { path: 'plants/:id', element: <PlantDetail /> },
      { path: 'plants/:id/edit', element: <PlantForm mode="edit" /> },
      { path: 'calendar', element: <Calendar /> },
      // Path stays /settings so any links shipped in past emails still resolve.
      { path: 'settings', element: <Subscribe /> },
    ],
  },
  // Standalone landing (no App shell) — the unsubscribe link in every email
  // lands here. Skipping the App parent keeps the page transactional and
  // avoids confusing the user with the full nav while they're confirming
  // a one-click action.
  { path: '/unsubscribed', element: <Unsubscribed /> },
])
