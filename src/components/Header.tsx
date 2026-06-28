import { useLocation, useNavigate } from 'react-router-dom'
import { PlantSprite } from './PlantSprite'
import { useIsOwner } from '../lib/owner'
import { button, colors, radius, type } from '../lib/tokens'

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const isOwner = useIsOwner()

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
          aria-label="Subscribe to reminders"
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
          <MailIcon />
        </button>
        {isOwner && (
          <span
            aria-label="owner mode unlocked"
            style={{
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              fontSize: 9.5,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              padding: '4px 9px',
              borderRadius: radius.pill,
              border: `1px solid ${colors.brand.DEFAULT}`,
              color: colors.brand.DEFAULT,
              background: 'transparent',
            }}
          >
            owner
          </span>
        )}
        {isOwner && (
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
        )}
      </div>
    </header>
  )
}

function MailIcon() {
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
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  )
}
