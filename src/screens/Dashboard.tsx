import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { derive, type DerivedPlant } from '../lib/derive'
import { MeterBar } from '../components/MeterBar'
import { NumberCountUp } from '../components/NumberCountUp'
import { PlantSprite } from '../components/PlantSprite'

const TODAY_LABEL = 'Friday · 19 June 2026'

type Filter = 'all' | 'thirsty'

export function Dashboard() {
  const { plants } = usePlants()
  const [filter, setFilter] = useState<Filter>('all')

  const derived = useMemo(
    () => plants.map((p) => derive(p, true)).sort((a, b) => a.nextIn - b.nextIn),
    [plants],
  )
  const thirstyCount = derived.filter((d) => d.nextIn <= 2).length
  const visible = filter === 'thirsty' ? derived.filter((d) => d.nextIn <= 2) : derived

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
            {TODAY_LABEL}
          </div>
          <div style={{ fontFamily: "'Newsreader', serif", fontSize: 48, lineHeight: 1, letterSpacing: '-.02em' }}>
            My plants
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Newsreader', serif", fontSize: 34, lineHeight: 1, color: '#b5613a' }}>
            <NumberCountUp target={thirstyCount} />
          </div>
          <div style={{ fontSize: 12, color: '#6b736a', marginTop: 3 }}>
            need water soon · {plants.length} total
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All plants
        </FilterButton>
        <FilterButton active={filter === 'thirsty'} onClick={() => setFilter('thirsty')}>
          Needs water
        </FilterButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visible.map((p) => (
          <PlantRow key={p.id} plant={p} />
        ))}
      </div>
    </div>
  )
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        border: '1px solid #e6e3d7',
        cursor: 'pointer',
        fontSize: 12.5,
        fontWeight: 600,
        padding: '7px 16px',
        borderRadius: 999,
        transition: 'all .25s',
        background: active ? '#1e3d2f' : '#fbfaf5',
        color: active ? '#eef0e4' : '#6b736a',
      }}
    >
      {children}
    </button>
  )
}

function PlantRow({ plant }: { plant: DerivedPlant }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate('/plants/' + plant.id)}
      className="hov-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        background: '#fbfaf5',
        border: '1px solid #e6e3d7',
        borderRadius: 20,
        padding: '16px 22px',
        cursor: 'pointer',
        transition: 'transform .35s cubic-bezier(.2,.8,.2,1), box-shadow .35s, border-color .35s',
      }}
    >
      <div
        style={{
          flex: 'none',
          width: 74,
          height: 74,
          borderRadius: 16,
          background: '#eef0e4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <PlantSprite arch={plant.arch} greens={plant.greens} size={62} />
      </div>
      <div style={{ flex: 'none', width: 184 }}>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: 23, lineHeight: 1.02 }}>{plant.name}</div>
        <div
          style={{
            fontFamily: "'Newsreader', serif",
            fontStyle: 'italic',
            fontSize: 13,
            color: '#9aa093',
            marginTop: 1,
          }}
        >
          {plant.common}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#8a907f',
            marginTop: 8,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '.02em',
          }}
        >
          {plant.loc}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <span
            style={{
              fontSize: 10.5,
              letterSpacing: '.12em',
              textTransform: 'uppercase',
              color: '#9aa093',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            Watering cycle
          </span>
          <span style={{ fontSize: 12, color: '#6b736a' }}>{plant.freqLabel}</span>
        </div>
        <MeterBar percent={plant.progress} color={plant.statusColor} />
        <div style={{ fontSize: 11.5, color: '#8a907f', marginTop: 8 }}>
          Last watered {plant.lastWateredAgo}
        </div>
      </div>
      <div style={{ flex: 'none', width: 96, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: "'Newsreader', serif",
            fontSize: 46,
            lineHeight: 0.85,
            color: plant.statusColor,
          }}
        >
          <NumberCountUp target={plant.bigNum} />
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: '#8a907f',
            textTransform: 'uppercase',
            letterSpacing: '.07em',
            fontFamily: 'ui-monospace, monospace',
            marginTop: 5,
          }}
        >
          {plant.bigSub}
        </div>
      </div>
    </div>
  )
}
