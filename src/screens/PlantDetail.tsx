import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { derive } from '../lib/derive'
import { MeterBar } from '../components/MeterBar'
import { NumberCountUp } from '../components/NumberCountUp'
import { PlantSprite } from '../components/PlantSprite'
import { StatusDot } from '../components/StatusDot'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { button, colors, radius, type } from '../lib/tokens'

export function PlantDetail() {
  const { id } = useParams<{ id: string }>()
  const { plants, water, remove } = usePlants()
  const navigate = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const plant = plants.find((p) => p.id === id)
  const sel = useMemo(() => (plant ? derive(plant, true) : null), [plant])

  if (!plants.length) return null
  if (!plant || !sel) return <Navigate to="/" replace />

  return (
    <div className="fade-up">
      <button
        onClick={() => navigate('/')}
        className="hov-gap"
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#6b736a',
          fontSize: 13,
          fontWeight: 600,
          padding: '6px 0',
          margin: '14px 0 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          transition: 'gap .25s',
        }}
      >
        ‹ All plants
      </button>

      <div
        className="pd-hero"
        style={{
          display: 'flex',
          background: '#1e3d2f',
          borderRadius: 26,
          overflow: 'hidden',
          color: '#eef0e4',
          minHeight: 262,
        }}
      >
        <div className="pd-hero-text" style={{ flex: 1, padding: '38px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '.16em',
              textTransform: 'uppercase',
              color: '#b6cf90',
              marginBottom: 16,
            }}
          >
            <StatusDot color={sel.dotColor} />
            {sel.statusLine}
          </div>
          <div className="pd-hero-name" style={{ fontFamily: "'Newsreader', serif", fontSize: 44, lineHeight: 1, letterSpacing: '-.01em' }}>
            {sel.name}
          </div>
          <div
            style={{
              fontFamily: "'Newsreader', serif",
              fontStyle: 'italic',
              fontSize: 16,
              color: '#9bb98a',
              marginTop: 5,
            }}
          >
            {sel.latin} · {sel.loc}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 11, marginTop: 24 }}>
            <span className="pd-hero-count" style={{ fontFamily: "'Newsreader', serif", fontSize: 74, lineHeight: 0.8 }}>
              <NumberCountUp target={sel.bigNum} />
            </span>
            <span style={{ fontSize: 14, color: '#9bb98a', maxWidth: 96, lineHeight: 1.2 }}>{sel.bigSub}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 26 }}>
            <button
              type="button"
              onClick={() => water(sel.id)}
              className="hov-scale"
              style={{
                border: button.primaryInverse.border,
                cursor: 'pointer',
                background: button.primaryInverse.background,
                color: button.primaryInverse.color,
                fontWeight: type.weight.semibold,
                fontSize: button.primaryInverse.fontSize,
                padding: button.primaryInverse.padding,
                borderRadius: radius.pill,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                transition: 'transform .25s',
              }}
            >
              💧 Water now
            </button>
            <button
              type="button"
              onClick={() => navigate('/plants/' + sel.id + '/edit')}
              className="hov-darken"
              style={{
                border: button.ghostOutlineInverse.border,
                cursor: 'pointer',
                background: button.ghostOutlineInverse.background,
                color: button.ghostOutlineInverse.color,
                fontWeight: type.weight.semibold,
                fontSize: button.ghostOutlineInverse.fontSize,
                padding: button.ghostOutlineInverse.padding,
                borderRadius: radius.pill,
                transition: 'background .25s',
              }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="hov-darken"
              style={{
                border: `1px solid ${colors.status.overdue}`,
                cursor: 'pointer',
                background: button.ghostOutlineInverse.background,
                color: colors.status.overdue,
                fontWeight: type.weight.semibold,
                fontSize: button.ghostOutlineInverse.fontSize,
                padding: button.ghostOutlineInverse.padding,
                borderRadius: radius.pill,
                transition: 'background .25s',
              }}
            >
              Delete
            </button>
          </div>
        </div>
        <div
          className="pd-hero-sprite"
          style={{
            flex: 'none',
            width: 300,
            background: '#274a39',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 188,
              height: 188,
              borderRadius: '50%',
              background: '#2f5743',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlantSprite
              arch={sel.arch}
              greens={sel.greens}
              variant={sel.size}
              size={150}
              className="sway-on-mount pd-sprite"
            />
          </div>
        </div>
      </div>

      <div className="pd-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 18, marginTop: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <StatTile label="Light" value={sel.light} />
            <StatTile label="Watering" value={sel.freqLabel} />
            <StatTile label="Last watered" value={sel.lastWateredAgo} />
            <StatTile label="Next due" value={sel.nextDueFmt} valueColor={sel.statusColor} />
          </div>
          <div
            style={{
              background: '#fbfaf5',
              border: '1px solid #e6e3d7',
              borderRadius: 18,
              padding: '20px 22px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 11,
              }}
            >
              <span
                style={{
                  fontSize: 10.5,
                  letterSpacing: '.12em',
                  textTransform: 'uppercase',
                  color: '#9aa093',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                Until next watering
              </span>
              <span style={{ fontSize: 12, color: sel.statusColor, fontWeight: 600 }}>{sel.statusLabel}</span>
            </div>
            <MeterBar percent={sel.progress} color={sel.statusColor} height={11} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              background: '#eef0e4',
              border: '1px solid #e0e4d2',
              borderRadius: 18,
              padding: '22px 24px',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: '#7c9b6b',
                marginBottom: 10,
              }}
            >
              🌿 Did you know?
            </div>
            <div
              style={{
                fontFamily: "'Newsreader', serif",
                fontSize: 19,
                lineHeight: 1.42,
                color: '#2a3a2c',
                textWrap: 'pretty',
              }}
            >
              {sel.fact}
            </div>
          </div>
          <div
            style={{
              background: '#fbfaf5',
              border: '1px solid #e6e3d7',
              borderRadius: 18,
              padding: '20px 24px',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                letterSpacing: '.14em',
                textTransform: 'uppercase',
                color: '#9aa093',
                marginBottom: 16,
              }}
            >
              Watering history
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sel.historyDerived.map((h) => (
                <div key={h.iso} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0' }}>
                  <span
                    style={{
                      flex: 'none',
                      width: 11,
                      height: 11,
                      borderRadius: '50%',
                      background: h.color,
                      boxShadow: '0 0 0 4px ' + h.ring,
                    }}
                  />
                  <span style={{ flex: 1, fontSize: 14.5, color: '#1b211c' }}>{h.dateFmt}</span>
                  <span style={{ fontSize: 12, color: '#9aa093', fontFamily: 'ui-monospace, monospace' }}>
                    {h.ago}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${sel.name}?`}
        body="This can’t be undone."
        destructive
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false)
          await remove(sel.id)
          navigate('/')
        }}
      />
    </div>
  )
}

function StatTile({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div
      style={{
        background: '#fbfaf5',
        border: '1px solid #e6e3d7',
        borderRadius: 18,
        padding: '18px 20px',
      }}
    >
      <div
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: 10,
          letterSpacing: '.14em',
          textTransform: 'uppercase',
          color: '#9aa093',
          marginBottom: 9,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: "'Newsreader', serif", fontSize: 21, color: valueColor }}>{value}</div>
    </div>
  )
}
