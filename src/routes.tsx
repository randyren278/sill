import { createBrowserRouter, Navigate, useParams } from 'react-router-dom'
import { App } from './App'
import { Dashboard } from './screens/Dashboard'
import { PlantDetail } from './screens/PlantDetail'
import { PlantForm } from './screens/PlantForm'
import { Calendar } from './screens/Calendar'
import { Subscribe } from './screens/Subscribe'
import { Unsubscribed } from './screens/Unsubscribed'
import { Owner } from './screens/Owner'
import { useIsOwner } from './lib/owner'

/**
 * Gates a child element on owner mode. Non-owners are redirected to `fallback`
 * via a client-side replace, so the URL doesn't linger in their history.
 */
function OwnerOnly({ children, fallback }: { children: React.ReactElement; fallback: string }) {
  return useIsOwner() ? children : <Navigate to={fallback} replace />
}

function EditGuard() {
  const { id } = useParams<{ id: string }>()
  return (
    <OwnerOnly fallback={'/plants/' + (id ?? '')}>
      <PlantForm mode="edit" />
    </OwnerOnly>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      {
        path: 'plants/new',
        element: (
          <OwnerOnly fallback="/">
            <PlantForm mode="new" />
          </OwnerOnly>
        ),
      },
      { path: 'plants/:id', element: <PlantDetail /> },
      { path: 'plants/:id/edit', element: <EditGuard /> },
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
  // Hidden owner-unlock page. No nav link points here; access by URL only.
  { path: '/owner', element: <Owner /> },
])
