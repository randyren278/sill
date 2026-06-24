// Sill — daily watering reminder.
//
// Invoked by pg_cron once daily (14:00 UTC ≈ 9am ET). Behaviour:
//
//   1. Reject unless the caller carries x-cron-secret = CRON_SHARED_SECRET.
//   2. Read reminder_settings (single-row, id=1). Skip if disabled or no email.
//   3. Hard send cap: refuse to send if any reminder_runs row exists for
//      today's UTC date with sent=true. Belt-and-braces against cron loops.
//   4. Classify every plant (overdue / today / soon / happy) and render a
//      full roster digest. No early-return when nothing is due — the user
//      gets a daily heartbeat that reminders are alive.
//   5. POST a single transactional email to Resend.
//   6. ALWAYS write one row to reminder_runs so the heartbeat banner can
//      detect silent stops.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SHARED_SECRET = Deno.env.get('CRON_SHARED_SECRET') ?? ''
const SENDER = Deno.env.get('REMINDER_SENDER') ?? 'Sill <reminders@pleasepleasepleasewater.me>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

function todayUtcIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  // Returns (a - b) in whole days.
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((da - db) / 86400000)
}

function fmtDate(iso: string): string {
  // "Jun 23"
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[m - 1] + ' ' + d + (y === new Date().getUTCFullYear() ? '' : ', ' + y)
}

type Plant = { id: string; name: string; last_watered: string; freq_days: number; loc: string }
type Status = 'overdue' | 'today' | 'soon' | 'happy'
type Classified = Plant & { status: Status; nextIn: number; dueDate: string }

function classify(p: Plant, todayUtc: string): Classified {
  const dueDate = addDays(p.last_watered, p.freq_days)
  const nextIn = daysBetween(dueDate, todayUtc)
  let status: Status
  if (nextIn < 0) status = 'overdue'
  else if (nextIn === 0) status = 'today'
  else if (nextIn <= 2) status = 'soon'
  else status = 'happy'
  return { ...p, status, nextIn, dueDate }
}

const GROUPS: { key: Status[]; label: string; color: string; dot: string }[] = [
  { key: ['overdue', 'today'], label: 'Needs water', color: '#b5613a', dot: '#d98a5b' },
  { key: ['soon'],             label: 'Due soon',     color: '#b8862f', dot: '#d8ab4a' },
  { key: ['happy'],            label: 'Happy',         color: '#3f6b4a', dot: '#7fae6a' },
]

function rowMeta(c: Classified): string {
  if (c.status === 'overdue') return c.loc + ' · ' + Math.abs(c.nextIn) + 'd overdue (due ' + fmtDate(c.dueDate) + ')'
  if (c.status === 'today')   return c.loc + ' · due today'
  if (c.status === 'soon')    return c.loc + ' · in ' + c.nextIn + 'd (' + fmtDate(c.dueDate) + ')'
  return c.loc + ' · next ' + fmtDate(c.dueDate)
}

function renderHtml(classified: Classified[], counts: { needs: number; soon: number; happy: number }): string {
  const summary = [
    counts.needs > 0 ? counts.needs + ' need water' : null,
    counts.soon  > 0 ? counts.soon  + ' due soon'   : null,
    counts.happy > 0 ? counts.happy + ' happy'      : null,
  ].filter(Boolean).join(' · ')

  const sections = GROUPS.map((g) => {
    const items = classified.filter((c) => g.key.includes(c.status))
    if (items.length === 0) return ''
    const rows = items.map((c) => {
      const link = APP_URL + '/plants/' + encodeURIComponent(c.id)
      return (
        '<tr><td style="padding:12px 0;border-bottom:1px solid #e6e3d7;">' +
        '<table role="presentation" style="width:100%;border-collapse:collapse;"><tr>' +
        '<td style="width:14px;vertical-align:top;padding-top:6px;"><div style="width:8px;height:8px;border-radius:50%;background:' + g.dot + ';"></div></td>' +
        '<td style="vertical-align:top;">' +
        '<a href="' + link + '" style="color:#1b211c;text-decoration:none;font-weight:600;font-size:15px;">' + c.name + '</a>' +
        '<div style="font-size:12px;color:#6b736a;margin-top:3px;font-family:-apple-system,sans-serif;">' + rowMeta(c) + '</div>' +
        '</td></tr></table></td></tr>'
      )
    }).join('')
    return (
      '<tr><td style="padding:18px 0 6px;">' +
      '<div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:' + g.color + ';">' + g.label + ' · ' + items.length + '</div>' +
      '</td></tr>' +
      '<tr><td><table role="presentation" style="width:100%;border-collapse:collapse;">' + rows + '</table></td></tr>'
    )
  }).join('')

  return (
    '<!doctype html><html><body style="font-family:-apple-system,sans-serif;background:#f3f1e9;padding:24px;margin:0;">' +
    '<table role="presentation" style="max-width:560px;margin:0 auto;background:#fbfaf5;border:1px solid #e6e3d7;border-radius:18px;padding:32px;">' +
    '<tr><td>' +
    '<div style="margin-bottom:14px;"><img src="' + APP_URL + '/icon-email.png" width="64" height="64" alt="Sill" style="display:block;border-radius:14px;background:#1e3d2f;padding:6px;image-rendering:pixelated;"/></div>' +
    '<div style="font-family:\'Newsreader\',Georgia,serif;font-size:30px;color:#1b211c;line-height:1;letter-spacing:-.01em;">Sill</div>' +
    '<div style="font-size:13px;color:#6b736a;margin-top:6px;">' + summary + '</div>' +
    sections +
    '<div style="margin-top:26px;"><a href="' + APP_URL + '" style="display:inline-block;padding:11px 22px;background:#1e3d2f;color:#eef0e4;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">Open Sill</a></div>' +
    '<div style="margin-top:18px;font-size:11px;color:#9aa093;">Manage reminders → <a href="' + APP_URL + '/settings" style="color:#6b736a;">' + APP_URL + '/settings</a></div>' +
    '</td></tr></table></body></html>'
  )
}

async function logRun(row: {
  due_count: number
  sent: boolean
  skip_reason?: string | null
  resend_id?: string | null
  error?: string | null
}) {
  await sb.from('reminder_runs').insert(row)
}

Deno.serve(async (req: Request) => {
  // Auth gate — refuse anything that didn't come from our cron.
  const supplied = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SHARED_SECRET || supplied !== CRON_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
  }

  // 1. Read settings.
  const { data: settings, error: sErr } = await sb
    .from('reminder_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (sErr) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'settings_read_failed', error: sErr.message })
    return new Response(JSON.stringify({ skipped: 'settings_read_failed' }), { status: 200 })
  }
  if (!settings?.enabled || !settings?.email) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'disabled' })
    return new Response(JSON.stringify({ skipped: 'disabled' }), { status: 200 })
  }

  // 2. Hard daily cap inside the sender (senate r2 finding).
  const todayUtc = todayUtcIso()
  const { count: alreadySent } = await sb
    .from('reminder_runs')
    .select('*', { count: 'exact', head: true })
    .gte('ran_at', todayUtc + 'T00:00:00Z')
    .eq('sent', true)
  if ((alreadySent ?? 0) >= 1) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'rate_limited' })
    return new Response(JSON.stringify({ skipped: 'rate_limited' }), { status: 200 })
  }

  // 3. Classify every plant.
  const { data: plants, error: pErr } = await sb
    .from('plants')
    .select('id,name,last_watered,freq_days,loc')
  if (pErr) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'plants_read_failed', error: pErr.message })
    return new Response(JSON.stringify({ skipped: 'plants_read_failed' }), { status: 200 })
  }

  const classified = (plants as Plant[])
    .map((p) => classify(p, todayUtc))
    .sort((a, b) => a.nextIn - b.nextIn)  // most-overdue first, healthiest last

  if (classified.length === 0) {
    // No plants at all — nothing meaningful to send.
    await logRun({ due_count: 0, sent: false, skip_reason: 'no_plants' })
    return new Response(JSON.stringify({ skipped: 'no_plants' }), { status: 200 })
  }

  const counts = {
    needs: classified.filter((c) => c.status === 'overdue' || c.status === 'today').length,
    soon:  classified.filter((c) => c.status === 'soon').length,
    happy: classified.filter((c) => c.status === 'happy').length,
  }

  let subject: string
  if (counts.needs > 0) subject = counts.needs + ' plant' + (counts.needs === 1 ? '' : 's') + ' need water'
  else if (counts.soon > 0) subject = counts.soon + ' plant' + (counts.soon === 1 ? '' : 's') + ' due soon'
  else subject = 'All ' + counts.happy + ' plant' + (counts.happy === 1 ? '' : 's') + ' happy 🌿'

  // 4. Send via Resend.
  if (!RESEND_API_KEY) {
    await logRun({ due_count: counts.needs, sent: false, skip_reason: 'missing_resend_key' })
    return new Response(JSON.stringify({ skipped: 'missing_resend_key' }), { status: 200 })
  }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: SENDER,
      to: settings.email,
      subject,
      html: renderHtml(classified, counts),
    }),
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    await logRun({ due_count: counts.needs, sent: false, error: JSON.stringify(body).slice(0, 1024) })
    return new Response(JSON.stringify({ sent: false, error: body }), { status: 200 })
  }
  await logRun({ due_count: counts.needs, sent: true, resend_id: (body as { id?: string }).id ?? null })
  return new Response(JSON.stringify({ sent: true, subject, counts }), { status: 200 })
})
