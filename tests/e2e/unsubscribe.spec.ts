import { test, expect, request } from '@playwright/test'
import { anonRest, serviceRest, cleanupTestSubscribers, testEmail } from './helpers/supabase'

/**
 * Unsubscribe flow has three states. We get to the token via the same edge
 * function pathway the digest uses: subscribe → cron-fan-out — but for tests
 * we use the service role to read last_resend_id and reconstruct the URL
 * from the audit row's HMAC-signed link in the Resend payload... too slow.
 *
 * Simpler: invoke the digest manually for a fresh test subscriber and the
 * function bakes the unsubscribe URL into the email's List-Unsubscribe header
 * — but we don't get that header back. Cleanest path is to add a tiny test
 * helper RPC that returns the canonical token for a given subscriber.
 *
 * That helper IS our `subscribe_test_token()` SQL function, deployed via the
 * test setup migration. If not present, the spec gracefully skips with a
 * clear message — production isn't affected.
 */

async function getTokenForSubscriber(subscriberId: string): Promise<string | null> {
  // The helper RPC `test_unsubscribe_token` is service-role-only; we call it
  // via /rest/v1/rpc/. Returns null if the secret hasn't been seeded.
  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!SUPABASE_URL || !SERVICE) return null
  const resp = await fetch(SUPABASE_URL + '/rest/v1/rpc/test_unsubscribe_token', {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: 'Bearer ' + SERVICE,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ subscriber_id: subscriberId }),
  })
  if (resp.status !== 200) return null
  const body = await resp.json()
  return (body as string | null) ?? null
}

test.describe('unsubscribe flow', () => {
  test.afterAll(async () => {
    await cleanupTestSubscribers()
  })

  test('three landing states render correctly', async () => {
    const email = testEmail('unsub')
    const sub = await anonRest.rpc('subscribe', { p_email: email })
    const subscribed = sub.body as { status: string; id: string } | null
    expect(subscribed?.status).toBe('subscribed')
    const subscriberId = subscribed!.id

    const token = await getTokenForSubscriber(subscriberId)
    test.skip(!token, 'test_unsubscribe_token RPC not deployed — skipping live unsubscribe checks.')

    const api = await request.newContext({ baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'https://pleasepleasepleasewater.me' })

    // 1. Fresh unsubscribe — eyebrow "Reminders off"
    const r1 = await api.get('/api/unsubscribe?token=' + encodeURIComponent(token!))
    expect(r1.status()).toBe(200)
    const html1 = await r1.text()
    expect(html1).toContain('Reminders off')
    expect(html1).not.toContain('Already off')
    expect(html1).not.toContain('Unsubscribe failed')

    // DB confirms enabled=false.
    const after = await serviceRest.select('subscribers', `id=eq.${subscriberId}&select=enabled,unsubscribed_at`)
    expect((after.body as { enabled: boolean; unsubscribed_at: string | null }[])[0].enabled).toBe(false)

    // 2. Repeat click — eyebrow "Already off", no second audit row.
    const beforeCount = await serviceRest.select('reminder_runs', `subscriber_id=eq.${subscriberId}&skip_reason=eq.unsubscribed_via_email&select=id`)
    const r2 = await api.get('/api/unsubscribe?token=' + encodeURIComponent(token!))
    expect(r2.status()).toBe(200)
    const html2 = await r2.text()
    expect(html2).toContain('Already off')
    const afterCount = await serviceRest.select('reminder_runs', `subscriber_id=eq.${subscriberId}&skip_reason=eq.unsubscribed_via_email&select=id`)
    expect((afterCount.body as unknown[]).length).toBe((beforeCount.body as unknown[]).length)

    // 3. Mangled token — eyebrow "Unsubscribe failed"
    const r3 = await api.get('/api/unsubscribe?token=' + encodeURIComponent(token!.slice(0, -4) + 'XXXX'))
    expect(r3.status()).toBe(400)
    const html3 = await r3.text()
    expect(html3).toContain('Unsubscribe failed')
  })
})
