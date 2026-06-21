import { Outlet } from 'react-router-dom'
import { Header } from './components/Header'

export function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f1e9', color: '#1b211c' }}>
      <div className="app-container" style={{ maxWidth: 1060, margin: '0 auto', padding: '0 28px 80px' }}>
        <Header />
        <Outlet />
      </div>
    </div>
  )
}
