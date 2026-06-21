import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { usePlants } from '../data/PlantsProvider'
import { TODAY } from '../lib/dates'
import { LIGHT_OPTIONS, SIZE_OPTIONS, SPECIES } from '../lib/species'
import { PlantSprite } from '../components/PlantSprite'
import { Select } from '../components/Select'
import { DatePicker } from '../components/DatePicker'
import { button, colors, radius, type } from '../lib/tokens'
import type { Plant, SizeKey } from '../data/types'

type FormState = {
  name: string
  loc: string
  speciesIdx: number
  light: string
  freq: number
  size: SizeKey
  lastWatered: string
}

function freshForm(): FormState {
  const sp = SPECIES[0]
  return { name: '', loc: '', speciesIdx: 0, light: sp.light, freq: sp.freq, size: sp.size, lastWatered: TODAY }
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
    size: p.size,
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

  const onSpecies = (i: number) => {
    const next = SPECIES[i]
    setForm((f) => ({ ...f, speciesIdx: i, light: next.light, freq: next.freq, size: next.size }))
  }

  const onSave = async () => {
    const name = form.name.trim() || sp.common
    if (mode === 'edit' && editing) {
      // Preserve the plant's existing fact when the species hasn't changed —
      // distinct per-plant facts (e.g. the 6 Monsteras) shouldn't get reset
      // every time someone edits an unrelated field.
      const speciesChanged = sp.latin !== editing.latin
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
        size: form.size,
        fact: speciesChanged ? sp.fact : editing.fact,
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
        size: form.size,
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

      <div className="pf-wrap" style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
        <div className="pf-sprite" style={{ flex: 'none', width: 172 }}>
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
              key={sp.arch + '|' + form.size + '|' + sp.greens}
              arch={sp.arch}
              greens={sp.greens}
              variant={form.size}
              size={128}
              style={{ animation: 'popIn .4s both' }}
            />
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#6b736a',
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
          <div className="pf-pair" style={{ display: 'flex', gap: 14 }}>
            <Field label="Species" style={{ flex: 1 }}>
              <Select
                value={form.speciesIdx}
                onChange={onSpecies}
                options={speciesOptions.map((o) => ({ value: o.idx, label: o.label }))}
                ariaLabel="Species"
              />
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
          <div className="pf-pair" style={{ display: 'flex', gap: 14 }}>
            <Field label="Light" style={{ flex: 1 }}>
              <Select
                value={form.light}
                onChange={(v) => setForm((f) => ({ ...f, light: v }))}
                options={LIGHT_OPTIONS.map((l) => ({ value: l, label: l }))}
                ariaLabel="Light"
              />
            </Field>
            <Field label="Size" style={{ flex: 1 }}>
              <Select<SizeKey>
                value={form.size}
                onChange={(v) => setForm((f) => ({ ...f, size: v }))}
                options={SIZE_OPTIONS.map((s) => ({ value: s.value, label: s.label }))}
                ariaLabel="Size"
              />
            </Field>
            <Field label="Last watered" style={{ flex: 1 }}>
              <DatePicker
                value={form.lastWatered}
                onChange={(v) => setForm((f) => ({ ...f, lastWatered: v }))}
                ariaLabel="Last watered"
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
                color: '#6b736a',
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
          <div className="pf-actions" style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button
              type="button"
              onClick={onSave}
              className="hov-tile"
              style={{
                border: button.primary.border,
                cursor: 'pointer',
                background: button.primary.background,
                color: button.primary.color,
                fontWeight: type.weight.semibold,
                fontSize: button.primary.fontSize,
                padding: button.primary.padding,
                borderRadius: radius.pill,
                transition: 'transform .25s',
              }}
            >
              {saveLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              style={{
                border: button.ghostOutline.border,
                cursor: 'pointer',
                background: button.ghostOutline.background,
                color: button.ghostOutline.color,
                fontWeight: type.weight.semibold,
                fontSize: button.ghostOutline.fontSize,
                padding: button.ghostOutline.padding,
                borderRadius: radius.pill,
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
  fontSize: type.body.fontSize,
  padding: '13px 15px',
  borderRadius: radius.input,
  border: `1px solid ${colors.border.DEFAULT}`,
  background: colors.surface.DEFAULT,
  color: colors.ink.primary,
  transition: 'border-color .2s, box-shadow .2s',
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
