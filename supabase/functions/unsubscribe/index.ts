// Sill — one-click unsubscribe, multi-subscriber.
//
// Public endpoint (no x-cron-secret, no JWT). Verifies an HMAC token sent
// in the daily reminder email and flips a SINGLE subscriber's row to
// enabled=false.
//
// Token format: `${subscriberId}.${base64url(hmac)}` where
//   payload = `${subscriberId}:${lower(email)}`
//   hmac    = HMAC-SHA256(UNSUBSCRIBE_SECRET, payload)
//
// The subscriberId in the URL lets us look up the row directly (no email
// disclosure), and the HMAC verifies the link came from a real send (rotate
// UNSUBSCRIBE_SECRET to invalidate every outstanding link).
//
// Three landing states share the same email-shell template:
//   - "Just unsubscribed"   — eyebrow REMINDERS OFF in happy-green
//   - "Already unsubscribed" — eyebrow ALREADY OFF in muted gray
//   - "Invalid / expired"    — eyebrow UNSUBSCRIBE FAILED in overdue-orange

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://pleasepleasepleasewater.me'

const sb = createClient(SUPABASE_URL, SERVICE_ROLE)

let cachedKey: CryptoKey | null = null
async function hmacKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey
  cachedKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(UNSUBSCRIBE_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
  return cachedKey
}

function fromBase64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseToken(token: string): { subscriberId: string; sig: Uint8Array } | null {
  if (!token || !UNSUBSCRIBE_SECRET) return null
  const dot = token.indexOf('.')
  if (dot < 36) return null  // UUID is 36 chars
  const subscriberId = token.slice(0, dot)
  const sigPart = token.slice(dot + 1)
  if (!UUID_RE.test(subscriberId) || sigPart.length < 16) return null
  try {
    return { subscriberId, sig: fromBase64url(sigPart) }
  } catch {
    return null
  }
}

async function verifySig(subscriberId: string, emailLower: string, sig: Uint8Array): Promise<boolean> {
  const key = await hmacKey()
  const payload = subscriberId + ':' + emailLower
  return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(payload))
}

function fmtFullDate(d: Date): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
  return days[d.getUTCDay()] + ', ' + months[d.getUTCMonth()] + ' ' + d.getUTCDate()
}

// Shared head — copies of this also live in send-watering-reminder and
// send-welcome. Three copies of ~30 lines of CSS is acceptable for
// Edge Functions (no shared-module support without a bundler).
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

type Variant = 'ok' | 'already' | 'error'

function eyebrowFor(v: Variant): { text: string; color: string; cls: string } {
  if (v === 'ok')      return { text: 'Reminders off',     color: '#3f6b4a', cls: 'sill-happy' }
  if (v === 'already') return { text: 'Already off',        color: '#858b80', cls: 'sill-faint' }
  return                       { text: 'Unsubscribe failed', color: '#b5613a', cls: 'sill-overdue' }
}

function pageHtml(v: Variant, message: string, subtext: string): string {
  const eb = eyebrowFor(v)
  const dateLabel = fmtFullDate(new Date())
  return (
    headHtml('Sill — ' + (v === 'error' ? 'Unsubscribe failed' : 'Unsubscribed')) +
    '<body class="sill-page-bg" style="margin:0;padding:0;background-color:#f1eee2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f1eee2" class="sill-page-bg" style="background-color:#f1eee2;">' +
    '<tr><td align="center" valign="top" style="padding:32px 16px 48px 16px;">' +
    '<table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" class="sill-card" style="width:100%;max-width:560px;background-color:#fbfaf5;border-radius:18px;border:1px solid #e6e3d7;">' +
    '<tr><td align="center" class="sill-header sill-divider-td" style="padding:36px 32px 28px 32px;border-bottom:1px solid #e6e3d7;">' +
    '<img src="' + APP_URL + '/icon-email.png" width="64" height="64" alt="Sill" style="display:block;border-radius:14px;image-rendering:pixelated;margin:0 auto 18px auto;">' +
    '<p class="sill-ink" style="margin:0 0 10px 0;font-family:\'Newsreader\',Georgia,serif;font-size:30px;font-weight:700;letter-spacing:-0.01em;line-height:1;color:#1b211c;">Sill</p>' +
    '<p class="' + eb.cls + '" style="margin:0 0 6px 0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:' + eb.color + ';">' + eb.text + '</p>' +
    '<p class="sill-faint" style="margin:0;font-family:ui-monospace,\'SF Mono\',Menlo,monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.18em;color:#858b80;">' + dateLabel + '</p>' +
    '</td></tr>' +
    '<tr><td class="sill-padded" style="padding:28px 32px 8px 32px;">' +
    '<p class="sill-ink" style="margin:0 0 14px 0;font-family:\'Newsreader\',Georgia,serif;font-size:20px;line-height:1.45;color:#1b211c;">' + message + '</p>' +
    '<p class="sill-muted" style="margin:0 0 22px 0;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;line-height:1.55;color:#6b736a;">' + subtext + '</p>' +
    '</td></tr>' +
    '<tr><td align="center" class="sill-footer sill-divider-td" style="padding:22px 32px 32px 32px;border-top:1px solid #e6e3d7;">' +
    '<a href="' + APP_URL + '" class="sill-cta" style="display:inline-block;background-color:#1e3d2f;color:#eef0e4;font-family:-apple-system,\'Hanken Grotesk\',BlinkMacSystemFont,\'Segoe UI\',sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:999px;mso-padding-alt:11px 22px;">Open Sill</a>' +
    '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>'
  )
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  const method = req.method.toUpperCase()

  if (method !== 'GET' && method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  const respond = (status: number, html: string, empty = false) => {
    if (method === 'POST') {
      return new Response(empty ? '' : html, {
        status,
        headers: { 'content-type': empty ? 'text/plain' : 'text/html; charset=utf-8' },
      })
    }
    return new Response(html, {
      status,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    })
  }

  const errorPage = pageHtml(
    'error',
    'We couldn’t process that unsubscribe link.',
    'The link may have expired or been tampered with. You can subscribe again from the home page.',
  )

  const parsed = parseToken(token)
  if (!parsed) {
    return respond(400, errorPage)
  }

  // Look up subscriber by id (never reveals other rows; uses service role).
  const { data: sub, error: subErr } = await sb
    .from('subscribers')
    .select('id,email,email_lower,enabled')
    .eq('id', parsed.subscriberId)
    .maybeSingle()
  if (subErr || !sub) {
    return respond(400, errorPage)
  }

  const ok = await verifySig(parsed.subscriberId, sub.email_lower, parsed.sig)
  if (!ok) {
    return respond(400, errorPage)
  }

  // Already off — no DB write, no audit row (keeps heartbeat clean).
  if (!sub.enabled) {
    return respond(200, pageHtml(
      'already',
      'Reminders are already off.',
      'You must’ve unsubscribed previously. You can subscribe again from the home page any time.',
    ), method === 'POST')
  }

  await sb.from('subscribers')
    .update({ enabled: false, unsubscribed_at: new Date().toISOString() })
    .eq('id', sub.id)
  await sb.from('reminder_runs').insert({
    subscriber_id: sub.id,
    due_count: 0,
    sent: false,
    skip_reason: 'unsubscribed_via_email',
  })

  return respond(200, pageHtml(
    'ok',
    'You’ve unsubscribed from daily reminders.',
    'Subscribe again any time from the home page.',
  ), method === 'POST')
})
