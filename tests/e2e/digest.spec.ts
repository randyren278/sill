import { test, expect, request } from '@playwright/test'
import { serviceRest, cleanupTestSubscribers, testEmail } from './helpers/supabase'
import { resend } from './helpers/resend'

/**
 * digest.spec — invokes send-watering-reminder via the cron secret and
 * asserts the fan-out + per-row rate cap behaviour.
 *
 * Requires CRON_SHARED_SECRET in the env. Skips with a clear message if
 * missing so the suite still runs against a non-owner clone.
 */

const CRON_SECRET = process.env.CRON_SHARED_SECRET ?? ''
const SUPABASE_URL = process.env.SUPABASE_URL ?? ''

test.describe('digest fan-out', () => {
  test.afterAll(async () => {
    await cleanupTestSubscribers()
  })

  test('fan-out sends one email per enabled subscriber, second invocation rate-limits', async () => {
    test.skip(!CRON_SECRET || !SUPABASE_URL, 'CRON_SHARED_SECRET / SUPABASE_URL not set — skipping digest spec.')

    // Subscribe via the canonical RPC.
    const email = testEmail('digest')
    const subResp = await fetch(SUPABASE_URL + '/rest/v1/rpc/subscribe', {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '',
        Authorization: 'Bearer ' + (process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ p_email: email }),
    })
    expect(subResp.status).toBe(200)
    const subData = (await subResp.json()) as { status: string; id?: string }
    expect(['subscribed', 'resubscribed']).toContain(subData.status)
    const subscriberId = subData.id!

    // Mark welcomed_at so the welcome doesn't fire, and clear last_sent_date.
    await serviceRest.update('subscribers', `id=eq.${subscriberId}`, {
      welcomed_at: new Date().toISOString(),
      last_sent_date: null,
    })

    // Invoke 1: should send to this subscriber + any other enabled ones.
    const inv1 = await fetch(SUPABASE_URL + '/functions/v1/send-watering-reminder', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': CRON_SECRET },
      body: '{}',
    })
    expect(inv1.status).toBe(200)
    const r1 = (await inv1.json()) as { subscribers: number; sent: number; rate_limited: number; failed: number }
    expect(r1.subscribers).toBeGreaterThanOrEqual(1)
    expect(r1.sent + r1.rate_limited + r1.failed).toBe(r1.subscribers)
    // At least our test subscriber should have been sent to.
    expect(r1.sent).toBeGreaterThanOrEqual(1)

    // Our row should now carry last_sent_date = today and a Resend id.
    const after = await serviceRest.select('subscribers',
      `id=eq.${subscriberId}&select=last_sent_date,last_resend_id`)
    const row = (after.body as { last_sent_date: string; last_resend_id: string | null }[])[0]
    expect(row.last_sent_date).toBe(new Date().toISOString().slice(0, 10))
    expect(row.last_resend_id).toBeTruthy()

    // Optional Resend cross-check.
    if (resend.available() && row.last_resend_id) {
      const msg = await resend.getMessage(row.last_resend_id)
      expect(msg).not.toBeNull()
      expect(msg!.to[0].toLowerCase()).toBe(email.toLowerCase())
      expect(['sent', 'delivered', 'queued']).toContain(msg!.last_event)
    }

    // Invoke 2: same subscriber should be rate-limited.
    const inv2 = await fetch(SUPABASE_URL + '/functions/v1/send-watering-reminder', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': CRON_SECRET },
      body: '{}',
    })
    const r2 = (await inv2.json()) as { subscribers: number; sent: number; rate_limited: number }
    // Every subscriber that was sent in invoke 1 should be rate-limited now.
    expect(r2.rate_limited).toBeGreaterThanOrEqual(1)
  })
})
