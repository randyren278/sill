// Sill — one-click unsubscribe, JSON API.
//
// The visible unsubscribe page is now `/unsubscribed` in the React app.
// This Edge Function is a pure backend that:
//   1. Verifies the HMAC token
//   2. Flips the subscriber's enabled flag if needed
//   3. Returns one of { status: 'ok' | 'already' | 'error' }
//
// Two surfaces, same logic:
//   - POST /functions/v1/unsubscribe?token=...   (RFC 8058 one-click;
//       Gmail / Apple Mail call this from the List-Unsubscribe header)
//   - POST /functions/v1/unsubscribe             (body: { token })
//     ← the React page at /unsubscribed calls this from the browser
//
// Token format (matches send-watering-reminder + send-welcome):
//   payload = `${subscriberId}:${lower(email)}`
//   hmac    = HMAC-SHA256(UNSUBSCRIBE_SECRET, payload)
//   token   = `${subscriberId}.${base64url(hmac)}`

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const UNSUBSCRIBE_SECRET = Deno.env.get('UNSUBSCRIBE_SECRET') ?? ''

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
  if (dot < 36) return null
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

type Status = 'ok' | 'already' | 'error'

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

function jsonResponse(status: number, body: { status: Status; message?: string }, isOneClick: boolean) {
  // RFC 8058 says the one-click endpoint returns empty 200 on success.
  if (isOneClick && body.status === 'ok') {
    return new Response('', { status, headers: { ...CORS_HEADERS, 'content-type': 'text/plain' } })
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }
  if (req.method.toUpperCase() !== 'POST') {
    return jsonResponse(405, { status: 'error', message: 'method not allowed' }, false)
  }

  // RFC 8058 one-click sends the token in the query string + form body
  // `List-Unsubscribe=One-Click`. The React app sends `{ token }` in JSON body.
  const url = new URL(req.url)
  let token = url.searchParams.get('token') ?? ''
  const isOneClick = token.length > 0
  if (!token) {
    const ct = req.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) {
      const body = await req.json().catch(() => ({})) as { token?: string }
      token = (body.token ?? '').trim()
    }
  }

  const parsed = parseToken(token)
  if (!parsed) {
    return jsonResponse(400, { status: 'error', message: 'invalid_token' }, isOneClick)
  }

  const { data: sub, error: subErr } = await sb
    .from('subscribers')
    .select('id,email_lower,enabled')
    .eq('id', parsed.subscriberId)
    .maybeSingle()
  if (subErr || !sub) {
    return jsonResponse(400, { status: 'error', message: 'invalid_token' }, isOneClick)
  }

  const ok = await verifySig(parsed.subscriberId, sub.email_lower, parsed.sig)
  if (!ok) {
    return jsonResponse(400, { status: 'error', message: 'invalid_token' }, isOneClick)
  }

  // Already off — no DB write, no audit row (keeps heartbeat clean).
  if (!sub.enabled) {
    return jsonResponse(200, { status: 'already' }, isOneClick)
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

  return jsonResponse(200, { status: 'ok' }, isOneClick)
})
