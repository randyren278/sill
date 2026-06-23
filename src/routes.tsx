import { createBrowserRouter } from 'react-router-dom'
import { App } from './App'
import { Dashboard } from './screens/Dashboard'
import { PlantDetail } from './screens/PlantDetail'
import { PlantForm } from './screens/PlantForm'
import { Calendar } from './screens/Calendar'
import { Settings } from './screens/Settings'

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
      { path: 'settings', element: <Settings /> },
    ],
  },
])
