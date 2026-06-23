import { useLocation, useNavigate } from 'react-router-dom'
import { PlantSprite } from './PlantSprite'
import { button, colors, radius, type } from '../lib/tokens'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()

  // The dashboard and detail screens both belong to the "Plants" tab.
  const onPlants = location.pathname === '/' || location.pathname.startsWith('/plants')
  const onCalendar = location.pathname === '/calendar'
  const onSettings = location.pathname === '/settings'

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
        background: `linear-gradient(${colors.canvas} 78%, rgba(243,241,233,0))`,
        marginBottom: 8,
      }}
    >
      <div
        onClick={() => navigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
      >
        <PlantSprite arch="broad" greens="forest" size={34} />
        <div>
          <div style={{ fontFamily: type.sectionTitle.fontFamily, fontSize: 23, lineHeight: 0.95, letterSpacing: '-.01em' }}>
            Sill
          </div>
          <div
            className="hdr-subtitle"
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 9.5,
              letterSpacing: '.22em',
              textTransform: 'uppercase',
              color: colors.ink.faint,
              marginTop: 1,
            }}
          >
            Plant care
          </div>
        </div>
      </div>
      <div className="hdr-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="hdr-btn"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: button.navTab.fontSize,
            fontWeight: type.weight.semibold,
            padding: button.navTab.padding,
            borderRadius: radius.pill,
            transition: 'all .25s',
            background: onPlants ? button.navTab.backgroundActive : button.navTab.backgroundInactive,
            color: onPlants ? button.navTab.colorActive : button.navTab.colorInactive,
          }}
        >
          Plants
        </button>
        <button
          type="button"
          onClick={() => navigate('/calendar')}
          className="hdr-btn"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: button.navTab.fontSize,
            fontWeight: type.weight.semibold,
            padding: button.navTab.padding,
            borderRadius: radius.pill,
            transition: 'all .25s',
            background: onCalendar ? button.navTab.backgroundActive : button.navTab.backgroundInactive,
            color: onCalendar ? button.navTab.colorActive : button.navTab.colorInactive,
          }}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="hdr-btn"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: button.navTab.fontSize,
            fontWeight: type.weight.semibold,
            padding: '9px 14px',
            borderRadius: radius.pill,
            transition: 'all .25s',
            background: onSettings ? button.navTab.backgroundActive : button.navTab.backgroundInactive,
            color: onSettings ? button.navTab.colorActive : button.navTab.colorInactive,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <GearIcon />
        </button>
        <button
          type="button"
          onClick={() => navigate('/plants/new')}
          className="hdr-btn hov-tile"
          style={{
            border: 'none',
            cursor: 'pointer',
            fontSize: button.navCta.fontSize,
            fontWeight: type.weight.semibold,
            padding: button.navCta.paddingWithLeadingIcon,
            borderRadius: radius.pill,
            background: button.navCta.background,
            color: button.navCta.color,
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

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
