import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../data/supabaseClient'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { button, colors, radius, type } from '../lib/tokens'

type ReminderSettings = {
  id: number
  email: string | null
  enabled: boolean
  send_hour_utc: number
}

type LastRun = {
  ran_at: string
  sent: boolean
  skip_reason: string | null
  due_count: number
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const min = Math.round((now - then) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return min + ' min ago'
  const hr = Math.round(min / 60)
  if (hr < 24) return hr + 'h ago'
  const d = Math.round(hr / 24)
  return d + 'd ago'
}

/**
 * Settings screen.
 *
 * Reminders — single email + enable toggle. Mutates the single-row
 *   reminder_settings table. Below the form, "Last sent" line read from
 *   reminder_runs.
 * Backup — added in feature #5.
 */
export function Settings() {
  const navigate = useNavigate()
  const toast = useToast()

  const [settings, setSettings] = useState<ReminderSettings | null>(null)
  const [lastRun, setLastRun] = useState<LastRun | null>(null)
  const [email, setEmail] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Backup section state.
  const [importBusy, setImportBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<{ plants: unknown[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('reminder_settings')
        .select('id,email,enabled,send_hour_utc')
        .eq('id', 1)
        .single()
      if (cancelled) return
      if (error) {
        setLoadError(error.message)
        return
      }
      setSettings(data as ReminderSettings)
      setEmail((data?.email as string | null) ?? '')
      setEnabled(Boolean(data?.enabled))
    })()
    ;(async () => {
      const { data } = await supabase
        .from('reminder_runs')
        .select('ran_at,sent,skip_reason,due_count')
        .order('ran_at', { ascending: false })
        .limit(1)
      if (cancelled) return
      if (data && data.length) setLastRun(data[0] as LastRun)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const onSave = async () => {
    if (!settings) return
    setSaving(true)
    const next = { email: email.trim() || null, enabled }
    const transitionedToEnabled = !settings.enabled && enabled && !!next.email
    const { error } = await supabase.from('reminder_settings').update(next).eq('id', 1)
    setSaving(false)
    if (error) {
      toast.show({ message: 'Couldn’t save: ' + error.message })
      return
    }
    setSettings({ ...settings, email: next.email, enabled: next.enabled })
    toast.show({ message: enabled ? 'Reminders on.' : 'Reminders off.' })

    // Fire the welcome email when reminders are turned ON for the first time.
    // The Edge Function is idempotent — it checks welcomed_at and skips if set.
    if (transitionedToEnabled) {
      const welcomeSecret = import.meta.env.VITE_WELCOME_SECRET as string | undefined
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
      if (welcomeSecret && supabaseUrl) {
        // Fire and forget — toast already shown, errors stay silent.
        fetch(supabaseUrl + '/functions/v1/send-welcome', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-welcome-secret': welcomeSecret },
        }).catch(() => { /* non-blocking */ })
      }
    }
  }

  const onExport = async () => {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .order('created_at', { ascending: true })
    if (error || !data) {
      toast.show({ message: 'Export failed: ' + (error?.message ?? 'no data') })
      return
    }
    const json = JSON.stringify({ plants: data, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sill-backup-' + new Date().toISOString().slice(0, 10) + '.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.show({ message: 'Exported ' + data.length + ' plant' + (data.length === 1 ? '' : 's') + '.' })
  }

  const onImportFile = async (file: File) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      toast.show({ message: 'Couldn’t read that file — not valid JSON.' })
      return
    }
    if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { plants?: unknown }).plants)) {
      toast.show({ message: 'Backup file must contain a "plants" array.' })
      return
    }
    setPendingImport(parsed as { plants: unknown[] })
  }

  const performImport = async () => {
    if (!pendingImport) return
    const secret = import.meta.env.VITE_IMPORT_SECRET as string | undefined
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!secret || !supabaseUrl) {
      toast.show({ message: 'Import not configured — set VITE_IMPORT_SECRET in .env.local.' })
      setPendingImport(null)
      return
    }
    setImportBusy(true)
    try {
      const resp = await fetch(supabaseUrl + '/functions/v1/import-backup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-import-secret': secret },
        body: JSON.stringify(pendingImport),
      })
      const body = await resp.json().catch(() => ({}))
      if (!resp.ok) {
        const reason = (body as { error?: string }).error ?? 'unknown error'
        toast.show({ message: 'Import failed: ' + reason })
      } else {
        toast.show({
          message:
            'Imported ' +
            ((body as { imported?: number }).imported ?? 0) +
            ' plant(s). Reload to see them.',
        })
      }
    } catch (e) {
      toast.show({ message: 'Import failed: ' + (e instanceof Error ? e.message : String(e)) })
    } finally {
      setImportBusy(false)
      setPendingImport(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="fade-up" style={{ maxWidth: 640, margin: '0 auto' }}>
      <button
        onClick={() => navigate('/')}
        className="hov-gap"
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: colors.ink.muted,
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
        ‹ Back
      </button>
      <div
        style={{
          fontFamily: type.screenTitle.fontFamily,
          fontSize: type.screenTitle.fontSize,
          lineHeight: type.screenTitle.lineHeight,
          letterSpacing: type.screenTitle.letterSpacing,
          marginBottom: 28,
        }}
      >
        Settings
      </div>

      <section
        style={{
          background: colors.surface.DEFAULT,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: 18,
          padding: '22px 26px',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: type.eyebrow.fontFamily,
            fontSize: type.eyebrow.fontSize,
            letterSpacing: type.eyebrow.letterSpacing,
            textTransform: type.eyebrow.textTransform,
            color: colors.ink.muted,
            marginBottom: 12,
          }}
        >
          Reminders
        </div>
        <div style={{ fontSize: 14, color: colors.ink.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Daily roster digest, sent once at 9am Pacific (16:00 UTC).
        </div>

        {loadError ? (
          <div style={{ fontSize: 13, color: colors.status.overdue }}>{loadError}</div>
        ) : !settings ? (
          <div style={{ fontSize: 13, color: colors.ink.faint }}>Loading…</div>
        ) : (
          <>
            <label
              style={{
                display: 'block',
                fontFamily: type.eyebrow.fontFamily,
                fontSize: 11,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                color: colors.ink.muted,
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoCapitalize="off"
              autoCorrect="off"
              inputMode="email"
              style={{
                width: '100%',
                fontSize: type.body.fontSize,
                padding: '13px 15px',
                borderRadius: radius.input,
                border: `1px solid ${colors.border.DEFAULT}`,
                background: colors.canvas,
                color: colors.ink.primary,
                marginBottom: 16,
                outline: 'none',
                transition: 'border-color .2s, box-shadow .2s',
              }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, cursor: 'pointer', minHeight: 44 }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: colors.brand.DEFAULT }}
              />
              <span style={{ fontSize: 14, color: colors.ink.primary }}>Send daily email reminders</span>
            </label>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="hov-tile"
              style={{
                border: 'none',
                cursor: saving ? 'wait' : 'pointer',
                background: button.primary.background,
                color: button.primary.color,
                fontWeight: type.weight.semibold,
                fontSize: button.primary.fontSize,
                padding: button.primary.padding,
                borderRadius: radius.pill,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <div style={{ fontSize: 12, color: colors.ink.faint, marginTop: 16, lineHeight: 1.5 }}>
              {lastRun
                ? lastRun.sent
                  ? 'Last sent ' + relativeTime(lastRun.ran_at) + ' (' + lastRun.due_count + ' plant' + (lastRun.due_count === 1 ? '' : 's') + ').'
                  : 'Last run ' + relativeTime(lastRun.ran_at) + ' — ' + (lastRun.skip_reason ?? 'skipped') + '.'
                : 'No reminder has run yet.'}
            </div>
          </>
        )}
      </section>

      <section
        style={{
          background: colors.surface.DEFAULT,
          border: `1px solid ${colors.border.DEFAULT}`,
          borderRadius: 18,
          padding: '22px 26px',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: type.eyebrow.fontFamily,
            fontSize: type.eyebrow.fontSize,
            letterSpacing: type.eyebrow.letterSpacing,
            textTransform: type.eyebrow.textTransform,
            color: colors.ink.muted,
            marginBottom: 12,
          }}
        >
          Backup
        </div>
        <div style={{ fontSize: 14, color: colors.ink.muted, marginBottom: 16, lineHeight: 1.5 }}>
          Export your plants as JSON — keep a copy in case the Supabase project ever pauses. Import overwrites plants with matching IDs.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <button
            type="button"
            onClick={onExport}
            className="hov-tile"
            style={{
              border: 'none',
              cursor: 'pointer',
              background: button.primary.background,
              color: button.primary.color,
              fontWeight: type.weight.semibold,
              fontSize: button.primary.fontSize,
              padding: button.primary.padding,
              borderRadius: radius.pill,
            }}
          >
            Export JSON
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onImportFile(f)
            }}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importBusy}
            className="hov-darken"
            style={{
              border: button.ghostOutline.border,
              cursor: importBusy ? 'wait' : 'pointer',
              background: button.ghostOutline.background,
              color: button.ghostOutline.color,
              fontWeight: type.weight.semibold,
              fontSize: button.ghostOutline.fontSize,
              padding: button.ghostOutline.padding,
              borderRadius: radius.pill,
              opacity: importBusy ? 0.7 : 1,
            }}
          >
            {importBusy ? 'Importing…' : 'Import JSON'}
          </button>
        </div>
      </section>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Import backup?"
        body={
          pendingImport
            ? 'Importing ' + pendingImport.plants.length + ' plant(s). Plants with matching IDs will be overwritten.'
            : ''
        }
        confirmLabel="Import"
        onCancel={() => {
          setPendingImport(null)
          if (fileRef.current) fileRef.current.value = ''
        }}
        onConfirm={performImport}
      />
    </div>
  )
}
