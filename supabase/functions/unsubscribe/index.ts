// Sill — one-click unsubscribe.
//
// Public endpoint (no x-cron-secret, no JWT). Verifies an HMAC token sent
// in the daily reminder email and flips reminder_settings.enabled to false.
//
// Two methods:
//   GET  /?token=<base64url(hmac)>   →  HTML confirmation page (200) or error page (400)
//   POST /?token=<base64url(hmac)>   →  empty 200 / 400  (RFC 8058 one-click)
//
// The single-tenant trust model means the only "user" is the owner; the
// token is a permission-bearer, not an identity. The HMAC is computed
// over the recipient email using UNSUBSCRIBE_SECRET, so no token table
// or expiry is needed — rotate the secret to invalidate all old links.

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

function base64url(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function verifyToken(email: string, token: string): Promise<boolean> {
  if (!email || !token || !UNSUBSCRIBE_SECRET) return false
  let bytes: Uint8Array
  try { bytes = fromBase64url(token) } catch { return false }
  const key = await hmacKey()
  return crypto.subtle.verify('HMAC', key, bytes, new TextEncoder().encode(email))
}

// Confirmation page — matches the digest email's visual style so the
// transition from inbox click to landing page feels seamless.
function pageHtml(opts: { ok: boolean; message: string; subtext?: string }): string {
  const accent = opts.ok ? '#3f6b4a' : '#b5613a'
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Sill — ' + (opts.ok ? 'Unsubscribed' : 'Unsubscribe failed') + '</title></head>' +
    '<body style="font-family:-apple-system,sans-serif;background:#f3f1e9;margin:0;padding:48px 24px;min-height:100vh;color:#1b211c;">' +
    '<table role="presentation" style="max-width:480px;margin:0 auto;background:#fbfaf5;border:1px solid #e6e3d7;border-radius:18px;padding:36px;">' +
    '<tr><td>' +
    '<div style="margin-bottom:14px;"><img src="' + APP_URL + '/icon-email.png" width="56" height="56" alt="Sill" style="display:block;border-radius:14px;background:#1e3d2f;padding:6px;image-rendering:pixelated;"/></div>' +
    '<div style="font-family:\'Newsreader\',Georgia,serif;font-size:28px;color:#1b211c;line-height:1.1;letter-spacing:-.01em;margin-bottom:6px;">Sill</div>' +
    '<div style="font-family:ui-monospace,monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:' + accent + ';margin-top:18px;">' +
    (opts.ok ? 'Reminders off' : 'Couldn’t unsubscribe') +
    '</div>' +
    '<div style="font-size:17px;color:#1b211c;margin-top:8px;line-height:1.4;">' + opts.message + '</div>' +
    (opts.subtext ? '<div style="font-size:13px;color:#6b736a;margin-top:14px;line-height:1.5;">' + opts.subtext + '</div>' : '') +
    '<div style="margin-top:26px;"><a href="' + APP_URL + '/settings" style="display:inline-block;padding:11px 22px;background:#1e3d2f;color:#eef0e4;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px;">Open Sill settings</a></div>' +
    '</td></tr></table></body></html>'
  )
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  const method = req.method.toUpperCase()

  if (method !== 'GET' && method !== 'POST') {
    return new Response('method not allowed', { status: 405 })
  }

  // Read current settings (we need the email to verify the token against).
  const { data: settings, error: sErr } = await sb
    .from('reminder_settings')
    .select('id,email,enabled')
    .eq('id', 1)
    .single()

  const respond = (status: number, html: string, empty = false) => {
    if (method === 'POST') {
      // RFC 8058 says one-click endpoint returns empty 200 on success.
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

  if (sErr || !settings?.email) {
    return respond(400, pageHtml({
      ok: false,
      message: 'We couldn’t process that unsubscribe link.',
      subtext: 'The link may have expired. You can manage reminders directly in Settings.',
    }))
  }

  const ok = await verifyToken(settings.email, token)
  if (!ok) {
    return respond(400, pageHtml({
      ok: false,
      message: 'We couldn’t process that unsubscribe link.',
      subtext: 'The link may have expired or been tampered with. You can manage reminders directly in Settings.',
    }))
  }

  if (settings.enabled) {
    await sb.from('reminder_settings').update({ enabled: false }).eq('id', 1)
    // Audit row so the heartbeat banner sees activity and we can trace
    // unsubscribe events alongside the daily sends.
    await sb.from('reminder_runs').insert({
      due_count: 0,
      sent: false,
      skip_reason: 'unsubscribed_via_email',
    })
  }

  return respond(200, pageHtml({
    ok: true,
    message: 'You’ve unsubscribed from daily reminders.',
    subtext: 'Re-enable them any time from Settings.',
  }), method === 'POST')
})
