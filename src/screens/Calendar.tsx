import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { buildCalendar } from '../lib/calendar'
import { derive } from '../lib/derive'
import { PlantSprite } from '../components/PlantSprite'
import { button, radius, type } from '../lib/tokens'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Calendar() {
  const { plants } = usePlants()
  const navigate = useNavigate()
  const [offset, setOffset] = useState(0)

  const cal = useMemo(() => buildCalendar(plants, offset), [plants, offset])

  const comingUp = useMemo(() => {
    return plants
      .map((p) => derive(p, true))
      .filter((d) => d.nextIn <= 21)
      .sort((a, b) => a.nextIn - b.nextIn)
      .map((d) => ({
        id: d.id,
        name: d.name,
        arch: d.arch,
        greens: d.greens,
        size: d.size,
        dateFmt: d.nextDueFmt,
        color: d.statusColor,
        rel:
          d.nextIn < 0
            ? Math.abs(d.nextIn) + 'd late'
            : d.nextIn === 0
              ? 'today'
              : 'in ' + d.nextIn + 'd',
      }))
  }, [plants])

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '24px 0 26px' }}>
        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: '#9aa093',
              marginBottom: 10,
            }}
          >
            Watering schedule
          </div>
          <div className="cal-month" style={{ fontFamily: "'Newsreader', serif", fontSize: 48, lineHeight: 1, letterSpacing: '-.02em' }}>
            {cal.monthLabel}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <NavButton onClick={() => setOffset((o) => o - 1)}>‹</NavButton>
          <NavButton onClick={() => setOffset((o) => o + 1)}>›</NavButton>
        </div>
      </div>

      <div className="cal-wrap" style={{ display: 'grid', gridTemplateColumns: '1.55fr .9fr', gap: 22, alignItems: 'start' }}>
        <div
          style={{
            background: '#fbfaf5',
            border: '1px solid #e6e3d7',
            borderRadius: 22,
            padding: 22,
          }}
        >
          <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 10 }}>
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                style={{
                  textAlign: 'center',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  color: '#9aa093',
                }}
              >
                {w}
              </div>
            ))}
          </div>
          <div className="cal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
            {cal.cells.map((c, i) => (
              <div
                key={i}
                className="cal-cell"
                style={{
                  aspectRatio: '1',
                  borderRadius: 12,
                  background: c.bg,
                  border: c.border,
                  padding: '7px 8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 0,
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: c.numColor }}>{c.day}</span>
                <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  {c.dots.map((d, di) => (
                    <span
                      key={di}
                      style={{ width: 7, height: 7, borderRadius: '50%', background: d }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div
            className="cal-legend"
            style={{
              display: 'flex',
              gap: 20,
              marginTop: 18,
              paddingTop: 16,
              borderTop: '1px solid #ece9dd',
            }}
          >
            <Legend color="#9bb98a" label="Watered" />
            <Legend color="#b8862f" label="Due soon" />
            <Legend color="#b5613a" label="Overdue" />
          </div>
        </div>

        <div>
          <div
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 10,
              letterSpacing: '.14em',
              textTransform: 'uppercase',
              color: '#9aa093',
              marginBottom: 14,
            }}
          >
            Coming up
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {comingUp.map((u) => (
              <div
                key={u.id}
                onClick={() => navigate('/plants/' + u.id)}
                className="hov-roster"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  background: '#fbfaf5',
                  border: '1px solid #e6e3d7',
                  borderRadius: 16,
                  padding: '11px 14px',
                  cursor: 'pointer',
                  transition: 'transform .3s, box-shadow .3s',
                }}
              >
                <div
                  style={{
                    flex: 'none',
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: '#eef0e4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <PlantSprite arch={u.arch} greens={u.greens} variant={u.size} size={38} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Newsreader', serif", fontSize: 17, lineHeight: 1.05 }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: '#9aa093', marginTop: 2 }}>{u.dateFmt}</div>
                </div>
                <div style={{ flex: 'none', textAlign: 'right' }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: u.color }}>{u.rel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function NavButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hov-cal-nav chip"
      style={{
        border: button.pager.border,
        background: button.pager.background,
        cursor: 'pointer',
        minWidth: button.pager.minWidth,
        height: button.pager.height,
        padding: button.pager.padding,
        borderRadius: radius.pill,
        fontSize: button.pager.iconGlyphSize,
        fontWeight: type.weight.semibold,
        color: button.pager.color,
        transition: 'all .25s',
      }}
    >
      {children}
    </button>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: '#6b736a' }}>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
      {label}
    </div>
  )
}
