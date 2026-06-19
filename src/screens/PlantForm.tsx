import { useMemo, useState, type ChangeEvent } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { TODAY } from '../lib/dates'
import { LIGHT_OPTIONS, SPECIES } from '../lib/species'
import { PlantSprite } from '../components/PlantSprite'
import type { Plant } from '../data/types'

type FormState = {
  name: string
  loc: string
  speciesIdx: number
  light: string
  freq: number
  lastWatered: string
}

function freshForm(): FormState {
  const sp = SPECIES[0]
  return { name: '', loc: '', speciesIdx: 0, light: sp.light, freq: sp.freq, lastWatered: TODAY }
}

function formFromPlant(p: Plant): FormState {
  let idx = SPECIES.findIndex((s) => s.latin === p.latin)
  if (idx < 0) idx = SPECIES.length - 1  // 'Other plant'
  return {
    name: p.name,
    loc: p.loc,
    speciesIdx: idx,
    light: p.light,
    freq: p.freqDays,
    lastWatered: p.lastWatered,
  }
}

export function PlantForm({ mode }: { mode: 'new' | 'edit' }) {
  const { id } = useParams<{ id: string }>()
  const { plants, upsert, loading } = usePlants()
  const navigate = useNavigate()

  const editing = mode === 'edit' ? plants.find((p) => p.id === id) ?? null : null

  // Wait for the editing target before mounting the inner form so its initial useState
  // sees the loaded plant. For 'new', mount immediately.
  if (mode === 'edit' && loading) return null
  if (mode === 'edit' && !editing) return <Navigate to="/" replace />

  return (
    <PlantFormInner
      mode={mode}
      editing={editing}
      upsert={upsert}
      navigate={navigate}
    />
  )
}

type FormInnerProps = {
  mode: 'new' | 'edit'
  editing: Plant | null
  upsert: (plant: Plant) => Promise<void>
  navigate: (to: string) => void
}

function PlantFormInner({ mode, editing, upsert, navigate }: FormInnerProps) {
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && editing ? formFromPlant(editing) : freshForm(),
  )

  const sp = SPECIES[form.speciesIdx]
  const title = mode === 'edit' ? 'Edit plant' : 'Add a plant'
  const saveLabel = mode === 'edit' ? 'Save changes' : 'Add to my plants'

  const speciesOptions = useMemo(
    () => SPECIES.map((s, i) => ({ idx: i, label: s.common + ' · ' + s.latin })),
    [],
  )

  const onCancel = () => {
    if (mode === 'edit' && editing) navigate('/plants/' + editing.id)
    else navigate('/')
  }

  const onSpecies = (e: ChangeEvent<HTMLSelectElement>) => {
    const i = Number(e.target.value)
    const next = SPECIES[i]
    setForm((f) => ({ ...f, speciesIdx: i, light: next.light, freq: next.freq }))
  }

  const onSave = async () => {
    const name = form.name.trim() || sp.common
    if (mode === 'edit' && editing) {
      const updated: Plant = {
        ...editing,
        name,
        loc: form.loc || editing.loc,
        latin: sp.latin,
        common: sp.common,
        light: form.light,
        freqDays: form.freq,
        arch: sp.arch,
        greens: sp.greens,
        fact: sp.fact,
        lastWatered: form.lastWatered,
      }
      await upsert(updated)
      navigate('/plants/' + updated.id)
    } else {
      const created: Plant = {
        id: 'p' + Date.now(),
        name,
        loc: form.loc || 'home',
        latin: sp.latin,
        common: sp.common,
        light: form.light,
        freqDays: form.freq,
        arch: sp.arch,
        greens: sp.greens,
        fact: sp.fact,
        lastWatered: form.lastWatered,
        history: [form.lastWatered],
      }
      await upsert(created)
      navigate('/')
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 760, margin: '0 auto' }}>
      <button
        onClick={onCancel}
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
        ‹ Cancel
      </button>
      <div style={{ fontFamily: "'Newsreader', serif", fontSize: 40, letterSpacing: '-.01em', marginBottom: 28 }}>
        {title}
      </div>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <div style={{ flex: 'none', width: 172 }}>
          <div
            style={{
              width: 172,
              height: 172,
              borderRadius: 22,
              background: '#eef0e4',
              border: '1px solid #e0e4d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <PlantSprite
              key={sp.arch + '|' + sp.greens}
              arch={sp.arch}
              greens={sp.greens}
              size={128}
              style={{ animation: 'popIn .4s both' }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#9aa093',
              marginTop: 10,
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            pixel sprite preview
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Field label="Nickname">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Monstera by the window"
              style={inputStyle}
            />
          </Field>
          <div style={{ display: 'flex', gap: 14 }}>
            <Field label="Species" style={{ flex: 1 }}>
              <select value={form.speciesIdx} onChange={onSpecies} style={{ ...inputStyle, cursor: 'pointer' }}>
                {speciesOptions.map((o) => (
                  <option key={o.idx} value={o.idx}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location" style={{ flex: 1 }}>
              <input
                value={form.loc}
                onChange={(e) => setForm((f) => ({ ...f, loc: e.target.value }))}
                placeholder="living room"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <Field label="Light" style={{ flex: 1 }}>
              <select
                value={form.light}
                onChange={(e) => setForm((f) => ({ ...f, light: e.target.value }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                {LIGHT_OPTIONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Last watered" style={{ flex: 1 }}>
              <input
                type="date"
                value={form.lastWatered}
                onChange={(e) => setForm((f) => ({ ...f, lastWatered: e.target.value }))}
                style={{ ...inputStyle, padding: '12px 15px' }}
              />
            </Field>
          </div>
          <div>
            <label
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: '#9aa093',
                fontFamily: 'ui-monospace, monospace',
                marginBottom: 10,
              }}
            >
              <span>Water every</span>
              <span style={{ color: '#3f6b4a' }}>{form.freq} days</span>
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={form.freq}
              onChange={(e) => setForm((f) => ({ ...f, freq: Number(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              onClick={onSave}
              className="hov-tile"
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#1e3d2f',
                color: '#eef0e4',
                fontWeight: 600,
                fontSize: 14.5,
                padding: '13px 28px',
                borderRadius: 999,
                transition: 'transform .25s',
              }}
            >
              {saveLabel}
            </button>
            <button
              onClick={onCancel}
              style={{
                border: '1px solid #e0ddce',
                cursor: 'pointer',
                background: 'transparent',
                color: '#6b736a',
                fontWeight: 600,
                fontSize: 14.5,
                padding: '13px 24px',
                borderRadius: 999,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%',
  fontSize: 15,
  padding: '13px 15px',
  borderRadius: 13,
  border: '1px solid #e0ddce',
  background: '#fbfaf5',
  color: '#1b211c',
  transition: 'all .2s',
} as const

function Field({
  label,
  children,
  style,
}: {
  label: string
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div style={style}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          letterSpacing: '.12em',
          textTransform: 'uppercase',
          color: '#9aa093',
          fontFamily: 'ui-monospace, monospace',
          marginBottom: 8,
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}
