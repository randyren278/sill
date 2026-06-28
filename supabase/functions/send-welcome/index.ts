// Sill — welcome email, per-subscriber.
//
// Public endpoint. Gated by WELCOME_SHARED_SECRET in the x-welcome-secret
// header (anyone with the anon key would otherwise be able to trigger it).
// Takes { email } in the POST body, looks up the subscriber row by
// email_lower, sends the welcome via Resend if welcomed_at IS NULL and
// enabled = true, then stamps welcomed_at. Idempotent — repeat calls for
// an already-welcomed subscriber are no-ops.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WELCOME_SECRET = Deno.env.get('WELCOME_SHARED_SECRET') ?? ''
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''
const SENDER = Deno.env.get('REMINDER_SENDER') ?? 'Sill <reminders@pleasepleasepleasewater.me>'
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me'

// Inline brand icon as a CID attachment — see send-watering-reminder for why.
const LOGO_CID = 'sill-logo'
const LOGO_URL = (Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me') + '/favicon-180.png'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

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

function fmtFullDate(d: Date): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return days[d.getUTCDay()] + ', ' + months[d.getUTCMonth()] + ' ' + d.getUTCDate()
}

// Shared head — same as the digest's headHtml. Three copies of ~30 lines of
// CSS is acceptable for Edge Functions (no bundler).
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
    '}' +
    '@media (prefers-color-scheme: dark){' +
      'body, .sill-page-bg{background-color:#10180f!important;}' +
      '.sill-card{background-color:#1f2d26!important;border-color:#264536!important;}' +
      '.sill-ink{color:#eef0e4!important;}' +
      '.sill-muted{color:#b6cf90!important;}' +
      '.sill-faint{color:#8aa589!important;}' +
      '.sill-divider-td{border-color:#264536!important;}' +
      '.sill-happy{color:#9bc586!important;}' +
      '.sill-overdue{color:#e09a6b!important;}' +
      '.sill-cta{background-color:#1e3d2f!important;color:#eef0e4!important;}' +
    '}' +
    '</style></head>'
  )
}

function welcomeBody(opts: {
  unsubUrl: string
  todayLabel: string
  samplePlants: { name: string; loc: string; dot: string; status: 'soon' | 'happy'; meta: string }[]
}): string {
  const sampleRows = opts.samplePlants.map((p) => {
    return (
      '<tr><td style="padding:10px 0;border-bottom:1px solid #e6e3d7;" class="sill-divider-td">' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr valign="top">' +
      '<td width="18" style="vertical-align:top;padding-top:3px;">' +
      '<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="8" height="8"><tr>' +
      '<td width="8" height="8" bgcolor="' + p.dot + '" style="background-color:' + p.dot + ';border-radius:50%;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>' +
      '</tr></table>' +
      '</td>' +
      '<td style="vertical-align:top;">' +
      '<div class="sill-ink" style="font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:15px;font-weight:600;color:#1b211c;line-height:1.3;margin-bottom:2px;">' + p.name + '</div>' +
      '<div class="sill-muted" style="font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:12px;color:#6b736a;line-height:1.4;">' + p.meta + '</div>' +
      '</td>' +
      '</tr></table></td></tr>'
    )
  }).join('')

  return (
    '<body class="sill-page-bg" style="margin:0;padding:0;background-color:#f1eee2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">' +
    '<div aria-hidden="true" style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">Welcome to Sill — your morning plant digest starts tomorrow.&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eee2" class="sill-page-bg" style="background-color:#f1eee2;">' +
    '<tr><td align="center" valign="top" style="padding:32px 16px 48px 16px;">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" class="sill-card" style="width:100%;max-width:560px;background-color:#fbfaf5;border-radius:18px;border:1px solid #e6e3d7;">' +
    '<tr><td align="center" class="sill-header sill-divider-td" style="padding:36px 32px 28px;border-bottom:1px solid #e6e3d7;">' +
    '<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 18px auto;border-collapse:separate;">' +
    '<tr><td bgcolor="#fbfaf5" width="64" height="64" style="background-color:#fbfaf5;border:1px solid #1e3d2f;border-radius:14px;padding:0;line-height:0;font-size:0;">' +
    '<img src="cid:' + LOGO_CID + '" width="64" height="64" alt="Sill" style="display:block;border-radius:14px;image-rendering:pixelated;">' +
    '</td></tr></table>' +
    '<p class="sill-ink" style="margin:0 0 10px 0;font-family:\'Newsreader\',Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:#1b211c;">Sill</p>' +
    '<p class="sill-happy" style="margin:0 0 6px 0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#3f6b4a;">Welcome</p>' +
    '<p class="sill-faint" style="margin:0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#858b80;">' + opts.todayLabel + '</p>' +
    '</td></tr>' +
    '<tr><td class="sill-padded" style="padding:28px 32px 8px;">' +
    '<p class="sill-ink" style="margin:0 0 16px 0;font-family:\'Newsreader\',Georgia,serif;font-size:20px;line-height:1.45;color:#1b211c;">You’re in. Tomorrow morning at 9 am Pacific, you’ll get your first daily roster — what needs water, what’s coming up, what’s looking healthy.</p>' +
    '<p class="sill-muted" style="margin:0 0 22px 0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;line-height:1.55;color:#6b736a;">Each email carries every plant grouped by status, plus a fun fact about one of your plants. One message a day, never more. Unsubscribe from any email in a single click.</p>' +
    '</td></tr>' +
    (opts.samplePlants.length > 0
      ? '<tr><td class="sill-padded" style="padding:0 32px 8px;">' +
        '<p class="sill-faint" style="margin:0 0 10px 0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#858b80;">A taste of tomorrow</p>' +
        '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' + sampleRows + '</table>' +
        '</td></tr>'
      : '') +
    '<tr><td align="center" class="sill-footer sill-divider-td" style="padding:28px 32px 32px;border-top:1px solid #e6e3d7;">' +
    '<a href="' + APP_URL + '" class="sill-cta" style="display:inline-block;background-color:#1e3d2f;color:#eef0e4;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:999px;mso-padding-alt:11px 22px;">Open Sill</a>' +
    '<p class="sill-faint" style="margin:14px 0 0 0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:11px;color:#858b80;">' +
    '<a href="' + opts.unsubUrl + '" class="sill-faint" style="color:#858b80;text-decoration:none;">Unsubscribe</a>' +
    '</p>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>'
  )
}

type Plant = { id: string; name: string; loc: string; last_watered: string; freq_days: number }

function pickSamplePlants(plants: Plant[], todayUtc: Date): { name: string; loc: string; dot: string; status: 'soon' | 'happy'; meta: string }[] {
  if (plants.length === 0) return []
  const todayIso = todayUtc.toISOString().slice(0, 10)
  const enriched = plants.map((p) => {
    const due = new Date(p.last_watered + 'T00:00:00Z')
    due.setUTCDate(due.getUTCDate() + p.freq_days)
    const nextIn = Math.round((due.getTime() - Date.parse(todayIso + 'T00:00:00Z')) / 86400000)
    return { p, nextIn, dueIso: due.toISOString().slice(0, 10) }
  })
  const soon = enriched.find((e) => e.nextIn > 0 && e.nextIn <= 4)
  const happy = enriched.find((e) => e.nextIn > 4)
  const picks = [soon, happy].filter(Boolean) as typeof enriched
  if (picks.length === 0) picks.push(enriched[0])
  return picks.slice(0, 2).map((e) => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const [y, m, d] = e.dueIso.split('-').map(Number)
    const dueLabel = months[m - 1] + ' ' + d + (y === todayUtc.getUTCFullYear() ? '' : ', ' + y)
    if (e.nextIn <= 4 && e.nextIn >= 0) {
      return { name: e.p.name, loc: e.p.loc, dot: '#d8ab4a', status: 'soon' as const, meta: e.p.loc + ' · in ' + e.nextIn + 'd (' + dueLabel + ')' }
    }
    return { name: e.p.name, loc: e.p.loc, dot: '#7fae6a', status: 'happy' as const, meta: e.p.loc + ' · next ' + dueLabel }
  })
}

async function logRun(row: {
  subscriber_id?: string | null
  skip_reason: string
  error?: string | null
  resend_id?: string | null
}) {
  await sb.from('reminder_runs').insert({
    subscriber_id: row.subscriber_id ?? null,
    due_count: 0,
    sent: row.skip_reason === 'welcome_sent',
    skip_reason: row.skip_reason,
    error: row.error ?? null,
    resend_id: row.resend_id ?? null,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method.toUpperCase() !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const supplied = req.headers.get('x-welcome-secret') ?? ''
  if (!WELCOME_SECRET || supplied !== WELCOME_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } })
  }

  const body = await req.json().catch(() => ({})) as { email?: string }
  const email = (body.email ?? '').trim()
  if (!email || email.indexOf('@') < 0) {
    await logRun({ skip_reason: 'welcome_failed', error: 'invalid_email' })
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 })
  }

  const { data: sub, error: subErr } = await sb
    .from('subscribers')
    .select('id,email,enabled,welcomed_at')
    .eq('email_lower', email.toLowerCase())
    .maybeSingle()
  if (subErr) {
    await logRun({ skip_reason: 'welcome_failed', error: subErr.message })
    return new Response(JSON.stringify({ error: 'lookup_failed' }), { status: 200 })
  }
  if (!sub) {
    await logRun({ skip_reason: 'welcome_skipped_not_subscribed' })
    return new Response(JSON.stringify({ skipped: 'not_subscribed' }), { status: 200 })
  }
  if (!sub.enabled) {
    await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_skipped_not_enabled' })
    return new Response(JSON.stringify({ skipped: 'not_enabled' }), { status: 200 })
  }
  if (sub.welcomed_at) {
    await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_skipped_already_welcomed' })
    return new Response(JSON.stringify({ skipped: 'already_welcomed' }), { status: 200 })
  }

  if (!RESEND_API_KEY) {
    await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_failed', error: 'missing_resend_key' })
    return new Response(JSON.stringify({ skipped: 'missing_resend_key' }), { status: 200 })
  }
  if (!UNSUBSCRIBE_SECRET) {
    await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_failed', error: 'missing_unsubscribe_secret' })
    return new Response(JSON.stringify({ skipped: 'missing_unsubscribe_secret' }), { status: 200 })
  }

  const { data: plants } = await sb
    .from('plants')
    .select('id,name,loc,last_watered,freq_days')

  const today = new Date()
  const samplePlants = pickSamplePlants((plants ?? []) as Plant[], today)
  const { humanUrl, listUnsubUrl } = await unsubscribeUrls(sub.id, sub.email)

  const html = headHtml('Welcome to Sill') + welcomeBody({
    unsubUrl: humanUrl,
    todayLabel: fmtFullDate(today),
    samplePlants,
  })

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: SENDER,
      to: sub.email,
      subject: 'Welcome to Sill 🌿',
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
  const respBody = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_failed', error: JSON.stringify(respBody).slice(0, 1024) })
    return new Response(JSON.stringify({ sent: false, error: respBody }), { status: 200 })
  }

  const resendId = (respBody as { id?: string }).id ?? null
  await sb.from('subscribers').update({ welcomed_at: new Date().toISOString() }).eq('id', sub.id)
  await logRun({ subscriber_id: sub.id, skip_reason: 'welcome_sent', resend_id: resendId })

  return new Response(JSON.stringify({ sent: true, resend_id: resendId }), { status: 200 })
})
