// Sill — daily watering reminder.
//
// Invoked by pg_cron once daily (16:00 UTC = 9am PDT / 8am PST). Behaviour:
//
//   1. Reject unless the caller carries x-cron-secret = CRON_SHARED_SECRET.
//   2. Read reminder_settings (single-row, id=1). Skip if disabled or no email.
//   3. Hard send cap: refuse to send if any reminder_runs row exists for
//      today's UTC date with sent=true. Belt-and-braces against cron loops.
//   4. Classify every plant (overdue / today / soon / happy) and render a
//      full roster digest. No early-return when nothing is due — the user
//      gets a daily heartbeat that reminders are alive.
//   5. POST a single transactional email to Resend, with RFC 8058
//      List-Unsubscribe headers carrying an HMAC-signed unsubscribe link.
//   6. ALWAYS write one row to reminder_runs so the heartbeat banner can
//      detect silent stops.
//
// Email design v2: table-based layout from docs/Sill Email - Standalone.html,
// left-stripe group accents, fun fact section, dark-mode @media block.
// Palette locked by 3-lens audit (contrast / brand-fidelity / email-client).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SHARED_SECRET = Deno.env.get('CRON_SHARED_SECRET') ?? ''
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''
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
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = Date.UTC(ay, am - 1, ad)
  const db = Date.UTC(by, bm - 1, bd)
  return Math.round((da - db) / 86400000)
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return months[m - 1] + ' ' + d + (y === new Date().getUTCFullYear() ? '' : ', ' + y)
}

function fmtFullDate(d: Date): string {
  // "Tuesday, June 23"
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return days[d.getUTCDay()] + ', ' + months[d.getUTCMonth()] + ' ' + d.getUTCDate()
}

// HMAC-SHA256 over the recipient email — same construction the unsubscribe
// Edge Function verifies. Module-scoped key cache avoids re-import per send.
let cachedKey: CryptoKey | null = null
async function hmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(UNSUBSCRIBE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return cachedKey
}

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function unsubscribeUrl(email: string): Promise<string> {
  const key = await hmacKey()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email))
  return APP_URL + '/api/unsubscribe?token=' + encodeURIComponent(base64url(new Uint8Array(sig)))
}

type Plant = {
  id: string; name: string; loc: string; last_watered: string; freq_days: number;
  fact?: string | null; latin?: string | null; common?: string | null;
}
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

const GROUPS: { key: Status[]; label: string; color: string; dot: string; cls: string }[] = [
  { key: ['overdue', 'today'], label: 'Needs water', color: '#b5613a', dot: '#d98a5b', cls: 'sill-overdue' },
  { key: ['soon'],             label: 'Due soon',     color: '#b8862f', dot: '#d8ab4a', cls: 'sill-soon'    },
  { key: ['happy'],            label: 'Happy',         color: '#3f6b4a', dot: '#7fae6a', cls: 'sill-happy'   },
]

function rowMeta(c: Classified): string {
  if (c.status === 'overdue') return c.loc + ' · ' + Math.abs(c.nextIn) + 'd overdue (due ' + fmtDate(c.dueDate) + ')'
  if (c.status === 'today')   return c.loc + ' · due today'
  if (c.status === 'soon')    return c.loc + ' · in ' + c.nextIn + 'd (' + fmtDate(c.dueDate) + ')'
  return c.loc + ' · next ' + fmtDate(c.dueDate)
}

// Deterministic-per-UTC-day fact pick. Cycles through the user's roster so
// the same plant never repeats two days in a row when the count > 1.
function pickFactOfDay(plants: Plant[]): { plant: Plant; fact: string } | null {
  if (plants.length === 0) return null
  const withFact = plants.filter((p) => (p.fact ?? '').trim().length > 0)
  if (withFact.length === 0) return null
  const epoch = Date.UTC(2026, 0, 1)
  const dayIdx = Math.floor((Date.now() - epoch) / 86400000)
  const idx = ((dayIdx % withFact.length) + withFact.length) % withFact.length
  return { plant: withFact[idx], fact: withFact[idx].fact ?? '' }
}

// Shared head — dark-mode aware. Palette locked by 3-lens audit.
function headHtml(title: string): string {
  return (
    '<!doctype html><html lang="en"><head>' +
    '<meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="color-scheme" content="light dark">' +
    '<meta name="supported-color-schemes" content="light dark">' +
    '<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">' +
    '<title>' + title + '</title>' +
    '<style>' +
    '@media only screen and (max-width:600px){' +
      '.sill-card{width:100%!important;max-width:100%!important;}' +
      '.sill-padded{padding:24px 18px!important;}' +
      '.sill-header{padding:32px 20px 22px!important;}' +
      '.sill-footer{padding:20px 20px 28px!important;}' +
      '.sill-fact-pad{padding:22px 22px!important;}' +
    '}' +
    '@media (prefers-color-scheme: dark){' +
      'body, .sill-page-bg{background-color:#10180f!important;}' +
      '.sill-card{background-color:#1f2d26!important;border-color:#264536!important;}' +
      '.sill-ink{color:#eef0e4!important;}' +
      '.sill-muted{color:#b6cf90!important;}' +
      '.sill-faint{color:#8aa589!important;}' +
      '.sill-divider-td{border-color:#264536!important;}' +
      '.sill-overdue{color:#e09a6b!important;}' +
      '.sill-soon{color:#e6bd60!important;}' +
      '.sill-happy{color:#9bc586!important;}' +
      '.sill-cta{background-color:#1e3d2f!important;color:#eef0e4!important;}' +
      '.sill-fact-card{background-color:#17241c!important;border-color:#264536!important;}' +
    '}' +
    '</style></head>'
  )
}

function renderHtml(
  classified: Classified[],
  counts: { needs: number; soon: number; happy: number },
  unsubUrl: string,
  factOfDay: { plant: Plant; fact: string } | null,
): string {
  const summary = [
    counts.needs > 0 ? counts.needs + ' need water' : null,
    counts.soon  > 0 ? counts.soon  + ' due soon'   : null,
    counts.happy > 0 ? counts.happy + ' happy'      : null,
  ].filter(Boolean).join(' · ')

  const today = new Date()
  const dateLabel = fmtFullDate(today)

  // Group sections — each is a table row with a 3px colored left-stripe accent.
  const sections = GROUPS.map((g) => {
    const items = classified.filter((c) => g.key.includes(c.status))
    if (items.length === 0) return ''
    const rows = items.map((c) => {
      const link = APP_URL + '/plants/' + encodeURIComponent(c.id)
      return (
        '<tr><td style="padding:12px 0 4px 0;border-bottom:1px solid #e6e3d7;" class="sill-divider-td">' +
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr valign="top">' +
        '<td width="18" style="vertical-align:top;padding-top:3px;">' +
        '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="8" height="8"><tr>' +
        '<td width="8" height="8" bgcolor="' + g.dot + '" style="background-color:' + g.dot + ';border-radius:50%;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>' +
        '</tr></table>' +
        '</td>' +
        '<td style="vertical-align:top;">' +
        '<a href="' + link + '" class="sill-ink" style="display:block;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:15px;font-weight:600;color:#1b211c;text-decoration:none;line-height:1.3;margin-bottom:2px;">' + c.name + '</a>' +
        '<span class="sill-muted" style="font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:12px;color:#6b736a;line-height:1.4;display:block;">' + rowMeta(c) + '</span>' +
        '</td>' +
        '</tr></table></td></tr>'
      )
    }).join('')
    return (
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">' +
      '<tr>' +
      '<td width="3" bgcolor="' + g.color + '" style="background-color:' + g.color + ';border-radius:3px;vertical-align:top;padding:0;font-size:1px;line-height:1;mso-line-height-rule:exactly;">&nbsp;</td>' +
      '<td style="padding:0 0 0 14px;vertical-align:top;">' +
      '<p class="' + g.cls + '" style="margin:0 0 12px 0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.18em;color:' + g.color + ';">' + g.label + ' · ' + items.length + '</p>' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' + rows + '</table>' +
      '</td>' +
      '</tr></table>'
    )
  }).join('')

  // Fun fact section — only if a plant with a fact is in the roster.
  const factSection = factOfDay
    ? '<tr><td class="sill-padded" style="padding:24px 24px 8px 24px;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="sill-fact-card" style="background-color:#fbfaf5;border:1px solid #e6e3d7;border-radius:14px;"><tr>' +
      '<td align="center" class="sill-fact-pad" style="padding:22px 26px;">' +
      '<p class="sill-faint" style="margin:0 0 10px 0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#858b80;">Today’s plant fact</p>' +
      '<p class="sill-ink" style="margin:0 0 10px 0;font-family:\'Newsreader\',Georgia,serif;font-size:17px;line-height:1.5;color:#1b211c;">' + factOfDay.fact + '</p>' +
      '<p class="sill-muted" style="margin:0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:12px;font-style:italic;color:#6b736a;">— ' + factOfDay.plant.name +
        (factOfDay.plant.latin ? ', <span style="font-style:italic;">' + factOfDay.plant.latin + '</span>' : '') +
      '</p>' +
      '</td></tr></table>' +
      '</td></tr>'
    : ''

  return (
    '<body class="sill-page-bg" style="margin:0;padding:0;background-color:#f1eee2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">' +
    // Preheader — inbox preview text. Padded with invisible chars so body text doesn't bleed through.
    '<div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">' + summary + '&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eee2" class="sill-page-bg" style="background-color:#f1eee2;">' +
    '<tr><td align="center" valign="top" style="padding:32px 16px 48px 16px;">' +

    // 560px card
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" class="sill-card" style="width:100%;max-width:560px;background-color:#fbfaf5;border-radius:18px;border:1px solid #e6e3d7;">' +

    // HEADER
    '<tr><td align="center" class="sill-header sill-divider-td" style="padding:36px 32px 28px 32px;border-bottom:1px solid #e6e3d7;">' +
    '<img src="' + APP_URL + '/icon-email.png" width="64" height="64" alt="Sill" style="display:block;border-radius:14px;image-rendering:pixelated;margin:0 auto 18px auto;">' +
    '<p class="sill-ink" style="margin:0 0 10px 0;font-family:\'Newsreader\',Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:#1b211c;">Sill</p>' +
    '<p class="sill-muted" style="margin:0 0 6px 0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:13px;color:#6b736a;line-height:1.5;">' + summary + '</p>' +
    '<p class="sill-faint" style="margin:0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#858b80;">' + dateLabel + '</p>' +
    '</td></tr>' +

    // GROUPS
    '<tr><td class="sill-padded" style="padding:6px 24px 24px 24px;">' + sections + '</td></tr>' +

    // FUN FACT
    factSection +

    // FOOTER
    '<tr><td align="center" class="sill-footer sill-divider-td" style="padding:22px 32px 32px 32px;border-top:1px solid #e6e3d7;">' +
    '<a href="' + APP_URL + '" class="sill-cta" style="display:inline-block;background-color:#1e3d2f;color:#eef0e4;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:999px;mso-padding-alt:11px 22px;">Open Sill</a>' +
    '<p class="sill-faint" style="margin:14px 0 0 0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:11px;color:#858b80;">' +
    '<a href="' + APP_URL + '/settings" class="sill-faint" style="color:#858b80;text-decoration:none;">Manage reminders →</a>&nbsp;·&nbsp;<a href="' + unsubUrl + '" class="sill-faint" style="color:#858b80;text-decoration:none;">Unsubscribe</a>' +
    '</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr></table>' +
    '</body></html>'
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

  // Hard daily cap inside the sender (senate r2 finding).
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

  const { data: plants, error: pErr } = await sb
    .from('plants')
    .select('id,name,last_watered,freq_days,loc,fact,latin,common')
  if (pErr) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'plants_read_failed', error: pErr.message })
    return new Response(JSON.stringify({ skipped: 'plants_read_failed' }), { status: 200 })
  }

  const classified = (plants as Plant[])
    .map((p) => classify(p, todayUtc))
    .sort((a, b) => a.nextIn - b.nextIn)  // most-overdue first, healthiest last

  if (classified.length === 0) {
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

  if (!RESEND_API_KEY) {
    await logRun({ due_count: counts.needs, sent: false, skip_reason: 'missing_resend_key' })
    return new Response(JSON.stringify({ skipped: 'missing_resend_key' }), { status: 200 })
  }
  if (!UNSUBSCRIBE_SECRET) {
    await logRun({ due_count: counts.needs, sent: false, skip_reason: 'missing_unsubscribe_secret' })
    return new Response(JSON.stringify({ skipped: 'missing_unsubscribe_secret' }), { status: 200 })
  }

  const unsubUrl = await unsubscribeUrl(settings.email)
  const factOfDay = pickFactOfDay(plants as Plant[])
  const html = headHtml('Your plant digest · Sill') + renderHtml(classified, counts, unsubUrl, factOfDay)

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: SENDER,
      to: settings.email,
      subject,
      html,
      headers: {
        'List-Unsubscribe': '<' + unsubUrl + '>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  const body = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    await logRun({ due_count: counts.needs, sent: false, error: JSON.stringify(body).slice(0, 1024) })
    return new Response(JSON.stringify({ sent: false, error: body }), { status: 200 })
  }
  await logRun({ due_count: counts.needs, sent: true, resend_id: (body as { id?: string }).id ?? null })
  return new Response(JSON.stringify({ sent: true, subject, counts, fact: factOfDay?.plant.name ?? null }), { status: 200 })
})
