// Direct REST calls against the Supabase project. Two surfaces:
//   - anonRest: uses the publishable key, simulates what a stranger sees.
//   - serviceRest: uses the service-role key, used for setup/teardown only.
//
// All assertions about RLS (privacy.spec) go through anonRest. Service
// role is for `delete from subscribers where email_lower = ...` cleanup.

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function assertEnv(name: string, val: string): string {
  if (!val) throw new Error(`Missing env var ${name} — copy .env.test.local.example to .env.test.local and fill it in.`)
  return val
}

async function request(opts: {
  apikey: string
  method: string
  path: string
  body?: unknown
  headers?: Record<string, string>
}): Promise<{ status: number; body: unknown }> {
  const url = assertEnv('SUPABASE_URL', SUPABASE_URL) + opts.path
  const resp = await fetch(url, {
    method: opts.method,
    headers: {
      apikey: opts.apikey,
      Authorization: 'Bearer ' + opts.apikey,
      'Content-Type': 'application/json',
      ...(opts.headers ?? {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await resp.text()
  let body: unknown
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  return { status: resp.status, body }
}

export const anonRest = {
  /** Direct GET against a table. Anon should be blocked from subscribers. */
  select: (table: string, query = '') =>
    request({ apikey: assertEnv('SUPABASE_ANON_KEY', ANON_KEY), method: 'GET', path: '/rest/v1/' + table + (query ? '?' + query : '') }),
  /** Call an RPC. */
  rpc: (fn: string, args: Record<string, unknown> = {}) =>
    request({ apikey: assertEnv('SUPABASE_ANON_KEY', ANON_KEY), method: 'POST', path: '/rest/v1/rpc/' + fn, body: args }),
}

export const serviceRest = {
  select: (table: string, query = '') =>
    request({ apikey: assertEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE), method: 'GET', path: '/rest/v1/' + table + (query ? '?' + query : '') }),
  delete: (table: string, query: string) =>
    request({ apikey: assertEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE), method: 'DELETE', path: '/rest/v1/' + table + '?' + query }),
  update: (table: string, query: string, body: Record<string, unknown>) =>
    request({
      apikey: assertEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE),
      method: 'PATCH',
      path: '/rest/v1/' + table + '?' + query,
      headers: { Prefer: 'return=representation' },
      body,
    }),
}

/** Generate a unique email per test run so specs don't interfere. */
export function testEmail(label: string): string {
  const nonce = Math.random().toString(36).slice(2, 8)
  const t = Date.now().toString(36)
  return `sill-test-${label}-${t}-${nonce}@example.com`
}

/** Drop every sill-test-*@example.com row. Called from afterAll hooks. */
export async function cleanupTestSubscribers(): Promise<void> {
  if (!SERVICE_ROLE) return
  await serviceRest.delete('subscribers', 'email_lower=like.sill-test-*@example.com')
}
