import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { derive, type DerivedPlant } from '../lib/derive'
import { MeterBar } from '../components/MeterBar'
import { NumberCountUp } from '../components/NumberCountUp'
import { PlantSprite } from '../components/PlantSprite'
import { useToast } from '../components/Toast'
import { useIsOwner } from '../lib/owner'
import { surfaceWriteError } from '../lib/writeErrors'
import { button, colors, radius, type } from '../lib/tokens'
import type { Plant } from '../data/types'

function todayLabel(): string {
  const d = new Date()
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const day = d.getDate()
  const month = d.toLocaleDateString('en-GB', { month: 'long' })
  const year = d.getFullYear()
  return weekday + ' · ' + day + ' ' + month + ' ' + year
}
const TODAY_LABEL = todayLabel()

type Filter = 'all' | 'thirsty'

export function Dashboard() {
  const { plants, waterMany, restorePlants } = usePlants()
  const toast = useToast()
  const isOwner = useIsOwner()
  const [filter, setFilter] = useState<Filter>('all')

  const derived = useMemo(
    () => plants.map((p) => derive(p, true)).sort((a, b) => a.nextIn - b.nextIn),
    [plants],
  )
  const thirstyCount = derived.filter((d) => d.nextIn <= 2).length
  const visible = filter === 'thirsty' ? derived.filter((d) => d.nextIn <= 2) : derived

  // Senate framing for the bulk button: "Water N due plants" = overdue + due-today.
  const dueIds = useMemo(() => derived.filter((d) => d.nextIn <= 0).map((d) => d.id), [derived])

  const handleWaterAll = async () => {
    if (dueIds.length === 0) return
    const snapshots: Plant[] = dueIds
      .map((id) => plants.find((p) => p.id === id))
      .filter((p): p is Plant => !!p)
    let results
    try {
      results = await waterMany(dueIds)
    } catch (err) {
      surfaceWriteError(err, toast)
      return
    }
    const late = results.filter((r) => r.daysLate > 0).sort((a, b) => b.daysLate - a.daysLate)
    const onTime = results.length - late.length
    const lateBits = late.map((r) => r.daysLate + 'd late').join(', ')
    const onTimeBit = onTime > 0 ? (lateBits ? ', ' : '') + onTime + ' on time' : ''
    const plantsWord = results.length === 1 ? 'plant' : 'plants'
    const message =
      'Watered ' + results.length + ' ' + plantsWord +
      (lateBits || onTimeBit ? ' — ' + lateBits + onTimeBit : '')
    toast.show({
      message,
      actionLabel: 'Undo',
      onAction: () => {
        restorePlants(snapshots).catch((err) => surfaceWriteError(err, toast))
      },
    })
  }

  return (
    <div className="fade-up">
      <div className="dash-hero" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '24px 0 26px' }}>
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
          <div className="dash-hero-title" style={{ fontFamily: "'Newsreader', serif", fontSize: 48, lineHeight: 1, letterSpacing: '-.02em' }}>
            My plants
          </div>
        </div>
        <div className="dash-hero-stats" style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Newsreader', serif", fontSize: 34, lineHeight: 1, color: '#b5613a' }}>
            <NumberCountUp target={thirstyCount} />
          </div>
          <div style={{ fontSize: 12, color: '#6b736a', marginTop: 3 }}>
            need water soon · {plants.length} total
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All plants
        </FilterButton>
        <FilterButton active={filter === 'thirsty'} onClick={() => setFilter('thirsty')}>
          Needs water
        </FilterButton>
        {isOwner && dueIds.length > 0 && (
          <button
            type="button"
            onClick={handleWaterAll}
            className="hov-scale chip"
            style={{
              marginLeft: 'auto',
              border: 'none',
              cursor: 'pointer',
              background: colors.brand.DEFAULT,
              color: colors.onBrand.fg,
              fontWeight: type.weight.semibold,
              fontSize: button.chip.fontSize,
              padding: '8px 16px',
              borderRadius: radius.pill,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'transform .25s',
            }}
          >
            💧 Water {dueIds.length} due {dueIds.length === 1 ? 'plant' : 'plants'}
          </button>
        )}
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
      type="button"
      onClick={onClick}
      style={{
        border: active ? button.chip.borderActive : button.chip.borderInactive,
        cursor: 'pointer',
        fontSize: button.chip.fontSize,
        fontWeight: type.weight.semibold,
        padding: button.chip.padding,
        borderRadius: radius.pill,
        transition: 'all .25s',
        background: active ? button.chip.backgroundActive : button.chip.backgroundInactive,
        color: active ? button.chip.colorActive : button.chip.colorInactive,
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
      className="plant-row hov-row"
      data-plant-id={plant.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        background: '#fbfaf5',
        border: '1px solid #e6e3d7',
        borderRadius: 20,
        padding: '16px 22px',
        cursor: 'pointer',
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
        <PlantSprite arch={plant.arch} greens={plant.greens} variant={plant.size} size={62} health={plant.health} />
      </div>
      <div className="plant-row-name" style={{ flex: 'none', width: 184 }}>
        <div className="pr-name" style={{ fontFamily: "'Newsreader', serif", fontSize: 23, lineHeight: 1.02 }}>{plant.name}</div>
        <div
          className="pr-latin"
          style={{
            fontFamily: "'Newsreader', serif",
            fontStyle: 'italic',
            fontSize: 13,
            color: '#6b736a',
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
      <div className="plant-row-meter" style={{ flex: 1, minWidth: 0 }}>
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
      <div className="plant-row-big" style={{ flex: 'none', width: 96, textAlign: 'right' }}>
        <div
          className="pr-big"
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
