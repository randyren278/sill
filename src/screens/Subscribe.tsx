import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../data/supabaseClient'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/Toast'
import { button, colors, radius, type } from '../lib/tokens'

/**
 * Subscribe screen.
 *
 * Public subscribe form — anyone visiting can sign up their email to receive
 * the daily plant digest. The page intentionally NEVER reads any subscriber
 * row from the DB. Submitting an email calls the security-definer RPC
 * `public.subscribe(p_email)`, which is the only write surface anon clients
 * have on `subscribers`.
 *
 * Backup section below stays as-is — per single-tenant trust model, anyone
 * can export / import the plant collection.
 */
export function Subscribe() {
  const navigate = useNavigate()
  const toast = useToast()

  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null)

  // Backup section state (carried over from old Settings).
  const [importBusy, setImportBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<{ plants: unknown[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.rpc('subscriber_count')
      if (cancelled) return
      if (typeof data === 'number') setSubscriberCount(data)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const fireWelcome = async (subscribedEmail: string) => {
    const welcomeSecret = import.meta.env.VITE_WELCOME_SECRET as string | undefined
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!welcomeSecret || !supabaseUrl) return
    fetch(supabaseUrl + '/functions/v1/send-welcome', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-welcome-secret': welcomeSecret },
      body: JSON.stringify({ email: subscribedEmail }),
    }).catch(() => { /* non-blocking */ })
  }

  const onSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) {
      toast.show({ message: 'Enter your email first.' })
      return
    }
    setSubmitting(true)
    const { data, error } = await supabase.rpc('subscribe', { p_email: trimmed })
    setSubmitting(false)
    if (error) {
      toast.show({ message: 'Couldn’t subscribe: ' + error.message })
      return
    }
    const status = (data as { status?: string } | null)?.status
    if (status === 'subscribed') {
      toast.show({ message: 'You’re in. Watch your inbox for a welcome.' })
      fireWelcome(trimmed)
      setEmail('')
      setSubscriberCount((c) => (c ?? 0) + 1)
    } else if (status === 'resubscribed') {
      toast.show({ message: 'Welcome back. Daily emails will start again tomorrow.' })
      fireWelcome(trimmed)
      setEmail('')
      setSubscriberCount((c) => (c ?? 0) + 1)
    } else if (status === 'already_subscribed') {
      toast.show({ message: 'You’re already on the list. Check your spam folder if nothing arrived.' })
      setEmail('')
    } else if (status === 'invalid_email') {
      toast.show({ message: 'That doesn’t look like a valid email.' })
    } else {
      toast.show({ message: 'Something went wrong. Try again?' })
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
        Subscribe
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
          Daily plant digest
        </div>
        <div style={{ fontSize: 14, color: colors.ink.muted, marginBottom: 18, lineHeight: 1.55 }}>
          Get a morning email with the status of every plant on the sill — what needs water,
          what’s coming up, what’s looking happy. One message a day, sent at 9 am Pacific.
          Unsubscribe in one click from any email.
        </div>

        <form onSubmit={onSubscribe}>
          <label
            htmlFor="subscribe-email"
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
            id="subscribe-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="email"
            inputMode="email"
            disabled={submitting}
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
              boxSizing: 'border-box',
            }}
          />
          <button
            type="submit"
            disabled={submitting}
            className="hov-tile"
            style={{
              border: 'none',
              cursor: submitting ? 'wait' : 'pointer',
              background: button.primary.background,
              color: button.primary.color,
              fontWeight: type.weight.semibold,
              fontSize: button.primary.fontSize,
              padding: button.primary.padding,
              borderRadius: radius.pill,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>

        {subscriberCount !== null && subscriberCount > 0 ? (
          <div style={{ fontSize: 12, color: colors.ink.faint, marginTop: 16, lineHeight: 1.5 }}>
            {subscriberCount === 1
              ? '1 person subscribed.'
              : subscriberCount + ' people subscribed.'}
          </div>
        ) : null}
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
          Export the plant collection as JSON, or import a backup. Import overwrites plants with matching IDs.
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
