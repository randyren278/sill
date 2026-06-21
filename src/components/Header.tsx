import { useLocation, useNavigate } from 'react-router-dom'
import { PlantSprite } from './PlantSprite'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  // The dashboard and detail screens both belong to the "Plants" tab.
  const onPlants = location.pathname === '/' || location.pathname.startsWith('/plants')
  const onCalendar = location.pathname === '/calendar'

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '22px 0 18px',
        background: 'linear-gradient(#f3f1e9 78%, rgba(243,241,233,0))',
        marginBottom: 8,
      }}
    >
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <PlantSprite arch="broad" greens="forest" size={34} />
        <div>
          <div style={{ fontFamily: "'Newsreader', serif", fontSize: 23, lineHeight: 0.95, letterSpacing: '-.01em' }}>
            Sill
          </div>
          <div
            className="hdr-subtitle"
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 9.5,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: '#9aa093',
              marginTop: 1,
            }}
          >
            Plant care
          </div>
        </div>
      </div>
      <div className="hdr-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={() => navigate('/')}
          className="hdr-btn"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '9px 18px',
            borderRadius: 999,
            transition: 'all .25s',
            background: onPlants ? '#1e3d2f' : 'transparent',
            color: onPlants ? '#eef0e4' : '#6b736a',
          }}
        >
          Plants
        </button>
        <button
          onClick={() => navigate('/calendar')}
          className="hdr-btn"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '9px 18px',
            borderRadius: 999,
            transition: 'all .25s',
            background: onCalendar ? '#1e3d2f' : 'transparent',
            color: onCalendar ? '#eef0e4' : '#6b736a',
          }}
        >
          Calendar
        </button>
        <button
          onClick={() => navigate('/plants/new')}
          className="hdr-btn hov-tile"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: 13.5,
            fontWeight: 600,
            padding: '9px 18px 9px 15px',
            borderRadius: 999,
            background: '#1e3d2f',
            color: '#eef0e4',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'transform .25s',
          }}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>＋</span>
          <span className="hdr-add-label">Add plant</span>
        </button>
      </div>
    </header>
  )
}
