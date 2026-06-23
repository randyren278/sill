import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Header } from './components/Header'
import { ReminderHealthBanner } from './components/ReminderHealthBanner'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f1e9', color: '#1b211c' }}>
      <ScrollToTop />
      <ReminderHealthBanner />
      <div className="app-container" style={{ maxWidth: 1060, margin: '0 auto', padding: '0 28px 80px' }}>
        <Header />
        <Outlet />
      </div>
    </div>
  )
}
