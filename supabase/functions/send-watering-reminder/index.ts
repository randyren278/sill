// Sill — daily watering reminder, multi-subscriber.
//
// Invoked by pg_cron once daily (16:00 UTC = 9am PDT / 8am PST). Behaviour:
//
//   1. Reject unless the caller carries x-cron-secret = CRON_SHARED_SECRET.
//   2. Fetch every subscribers row where enabled=true.
//   3. Fetch plants once (shared across the fan-out).
//   4. For each subscriber:
//        - Skip if last_sent_date = today_utc (per-row rate cap, replaces
//          the old global 1-per-day cap).
//        - Render the digest HTML with that subscriber's HMAC-signed
//          unsubscribe URL.
//        - POST to Resend.
//        - On success: stamp last_sent_date + last_resend_id.
//        - Always: insert one reminder_runs row keyed by subscriber_id.
//   5. Return aggregate counts ({subscribers, sent, rate_limited, failed}).
//
// Token construction (matches unsubscribe Edge Function):
//   payload = `${subscriberId}:${lower(email)}`
//   sig     = base64url(hmac_sha256(UNSUBSCRIBE_SECRET, payload))
//   token   = `${subscriberId}.${sig}`

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const CRON_SHARED_SECRET = Deno.env.get('CRON_SHARED_SECRET') ?? ''
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''
const SENDER = Deno.env.get('REMINDER_SENDER') ?? 'Sill <reminders@pleasepleasepleasewater.me>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me'

// Embed the brand icon inline (CID attachment) instead of a remote <img src>.
// Gmail proxies remote images and frequently silently fails to load them for
// first-touch senders, leaving a broken-image tile in the header. Resend
// fetches `path` at send time and embeds the bytes into the MIME message, so
// no client-side proxy fetch is required.
const LOGO_CID = 'sill-logo'
const LOGO_URL = (Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me') + '/favicon-180.png'

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

// HMAC-SHA256 over `${subscriberId}:${emailLower}`. Returns two URLs:
//   - humanUrl: the visible "Unsubscribe" link in the email footer. Points
//     at the React /unsubscribed page so the landing is real HTML.
//   - listUnsubUrl: target of the RFC 8058 List-Unsubscribe HTTP header.
//     Mail clients POST to this; the Edge Function flips the row.
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

async function unsubscribeUrls(subscriberId: string, email: string): Promise<{ humanUrl: string; listUnsubUrl: string }> {
  const key = await hmacKey()
  const payload = subscriberId + ':' + email.toLowerCase()
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  const token = subscriberId + '.' + base64url(new Uint8Array(sig))
  const encoded = encodeURIComponent(token)
  return {
    humanUrl: APP_URL + '/unsubscribed?token=' + encoded,
    listUnsubUrl: APP_URL + '/api/unsubscribe?token=' + encoded,
  }
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
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px auto;border-collapse:separate;">' +
    '<tr><td bgcolor="#fbfaf5" width="64" height="64" style="background-color:#fbfaf5;border:1px solid #1e3d2f;border-radius:14px;padding:0;line-height:0;font-size:0;">' +
    '<img src="cid:' + LOGO_CID + '" width="64" height="64" alt="Sill" style="display:block;border-radius:14px;image-rendering:pixelated;">' +
    '</td></tr></table>' +
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
    '<a href="' + unsubUrl + '" class="sill-faint" style="color:#858b80;text-decoration:none;">Unsubscribe</a>' +
    '</p>' +
    '</td></tr>' +

    '</table>' +
    '</td></tr></table>' +
    '</body></html>'
  )
}

async function logRun(row: {
  subscriber_id?: string | null
  due_count: number
  sent: boolean
  skip_reason?: string | null
  resend_id?: string | null
  error?: string | null
}) {
  await sb.from('reminder_runs').insert(row)
}

type Subscriber = { id: string; email: string; last_sent_date: string | null; welcomed_at: string | null }

Deno.serve(async (req: Request) => {
  // Auth gate — refuse anything that didn't come from our cron.
  const supplied = req.headers.get('x-cron-secret') ?? ''
  if (!CRON_SHARED_SECRET || supplied !== CRON_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
  }

  if (!RESEND_API_KEY) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'missing_resend_key' })
    return new Response(JSON.stringify({ skipped: 'missing_resend_key' }), { status: 200 })
  }
  if (!UNSUBSCRIBE_SECRET) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'missing_unsubscribe_secret' })
    return new Response(JSON.stringify({ skipped: 'missing_unsubscribe_secret' }), { status: 200 })
  }

  // 1. Fetch all enabled subscribers (service-role bypasses RLS).
  const { data: subscribers, error: subErr } = await sb
    .from('subscribers')
    .select('id,email,last_sent_date,welcomed_at')
    .eq('enabled', true)
  if (subErr) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'subscribers_read_failed', error: subErr.message })
    return new Response(JSON.stringify({ skipped: 'subscribers_read_failed' }), { status: 200 })
  }
  if (!subscribers || subscribers.length === 0) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'no_subscribers' })
    return new Response(JSON.stringify({ skipped: 'no_subscribers' }), { status: 200 })
  }

  // 2. Fetch plants once — they're shared across the fan-out.
  const { data: plants, error: pErr } = await sb
    .from('plants')
    .select('id,name,last_watered,freq_days,loc,fact,latin,common')
  if (pErr) {
    await logRun({ due_count: 0, sent: false, skip_reason: 'plants_read_failed', error: pErr.message })
    return new Response(JSON.stringify({ skipped: 'plants_read_failed' }), { status: 200 })
  }

  const todayUtc = todayUtcIso()
  const classified = (plants as Plant[])
    .map((p) => classify(p, todayUtc))
    .sort((a, b) => a.nextIn - b.nextIn)

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

  const factOfDay = pickFactOfDay(plants as Plant[])

  // 3. Fan out one Resend POST per subscriber, with per-row rate cap.
  let sentCount = 0
  let skippedRate = 0
  let failedCount = 0
  for (const sub of subscribers as Subscriber[]) {
    if (sub.last_sent_date === todayUtc) {
      await logRun({ subscriber_id: sub.id, due_count: counts.needs, sent: false, skip_reason: 'rate_limited' })
      skippedRate++
      continue
    }

    const { humanUrl, listUnsubUrl } = await unsubscribeUrls(sub.id, sub.email)
    const html = headHtml('Your plant digest · Sill') + renderHtml(classified, counts, humanUrl, factOfDay)

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: SENDER,
        to: sub.email,
        subject,
        html,
        headers: {
          'List-Unsubscribe': '<' + listUnsubUrl + '>',
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        attachments: [
          {
            filename: 'sill-logo.png',
            path: LOGO_URL,
            content_id: LOGO_CID,
          },
        ],
      }),
    })
    const body = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      await logRun({ subscriber_id: sub.id, due_count: counts.needs, sent: false, error: JSON.stringify(body).slice(0, 1024) })
      failedCount++
      continue
    }
    const resendId = (body as { id?: string }).id ?? null
    await sb.from('subscribers')
      .update({ last_sent_date: todayUtc, last_resend_id: resendId })
      .eq('id', sub.id)
    await logRun({ subscriber_id: sub.id, due_count: counts.needs, sent: true, resend_id: resendId })
    sentCount++
  }

  return new Response(JSON.stringify({
    subscribers: subscribers.length,
    sent: sentCount,
    rate_limited: skippedRate,
    failed: failedCount,
    subject,
    counts,
    fact: factOfDay?.plant.name ?? null,
  }), { status: 200 })
})
