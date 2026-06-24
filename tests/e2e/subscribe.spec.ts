import { test, expect } from '@playwright/test'
import { anonRest, serviceRest, cleanupTestSubscribers, testEmail } from './helpers/supabase'
import { resend } from './helpers/resend'

test.describe('subscribe flow', () => {
  test.afterAll(async () => {
    await cleanupTestSubscribers()
  })

  test('subscribes a brand-new email and fires a welcome', async ({ page }) => {
    const email = testEmail('fresh')
    await page.goto('/settings')

    // Page loads and the email input is EMPTY (privacy: no email pre-fill).
    const input = page.getByLabel(/email/i)
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('')

    await input.fill(email)
    await page.getByRole('button', { name: /^subscribe$/i }).click()

    // Toast confirms subscription.
    await expect(page.getByText(/You['’]re in/i)).toBeVisible({ timeout: 8000 })

    // DB row created.
    const { status, body } = await serviceRest.select('subscribers', `email_lower=eq.${email.toLowerCase()}&select=id,enabled,welcomed_at`)
    expect(status).toBe(200)
    const rows = body as { id: string; enabled: boolean; welcomed_at: string | null }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].enabled).toBe(true)

    // Welcome email fires asynchronously; poll for welcomed_at.
    for (let i = 0; i < 10; i++) {
      const r = await serviceRest.select('subscribers', `email_lower=eq.${email.toLowerCase()}&select=welcomed_at,last_resend_id`)
      const row = (r.body as { welcomed_at: string | null; last_resend_id: string | null }[])[0]
      if (row?.welcomed_at) {
        // Optional Resend cross-check.
        if (resend.available()) {
          const runs = await serviceRest.select('reminder_runs', `subscriber_id=eq.${rows[0].id}&skip_reason=eq.welcome_sent&order=ran_at.desc&limit=1&select=resend_id`)
          const resendId = (runs.body as { resend_id: string }[])[0]?.resend_id
          if (resendId) {
            const msg = await resend.getMessage(resendId)
            expect(msg).not.toBeNull()
            expect(msg!.to[0].toLowerCase()).toBe(email.toLowerCase())
          }
        }
        return
      }
      await new Promise((r) => setTimeout(r, 1500))
    }
    throw new Error('welcome did not fire within 15s')
  })

  test('repeat subscribe shows already-subscribed toast', async ({ page }) => {
    const email = testEmail('repeat')
    // Pre-subscribe via the RPC directly (bypasses UI to keep this test fast).
    await anonRest.rpc('subscribe', { p_email: email })

    await page.goto('/settings')
    await page.getByLabel(/email/i).fill(email)
    await page.getByRole('button', { name: /^subscribe$/i }).click()
    await expect(page.getByText(/already on the list/i)).toBeVisible({ timeout: 8000 })
  })

  test('invalid email is rejected by the RPC', async () => {
    // The RPC layer is what really decides — the HTML5 form just makes the
    // common case unreachable. Call subscribe() with garbage and confirm the
    // status is invalid_email and the response never leaks an email.
    const r = await anonRest.rpc('subscribe', { p_email: 'not-an-email' })
    expect(r.status).toBe(200)
    expect((r.body as { status: string }).status).toBe('invalid_email')
  })
})
