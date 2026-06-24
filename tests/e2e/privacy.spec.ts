import { test, expect } from '@playwright/test'
import { anonRest } from './helpers/supabase'

test.describe('privacy — owner email is never exposed', () => {
  test('direct table select with anon key returns no rows', async () => {
    const { status, body } = await anonRest.select('subscribers', 'select=id,email')
    // RLS blocks: either 200 with [] (no policy matched) or 401/403.
    if (status === 200) {
      expect(body).toEqual([])
    } else {
      expect([401, 403]).toContain(status)
    }
  })

  test('subscribe RPC works but does not return existing emails', async () => {
    // The subscribe RPC should return only a status + (for new rows) id.
    // It must NEVER include any email in the response.
    const probe = await anonRest.rpc('subscribe', { p_email: 'not-an-email' })
    expect(probe.status).toBe(200)
    expect((probe.body as { status: string }).status).toBe('invalid_email')
    const json = JSON.stringify(probe.body)
    expect(json).not.toMatch(/@/)  // no email in response, ever
  })

  test('subscriber_count RPC returns only an integer', async () => {
    const r = await anonRest.rpc('subscriber_count')
    expect(r.status).toBe(200)
    expect(typeof r.body).toBe('number')
  })

  test('homepage HTML contains no email addresses', async ({ page }) => {
    await page.goto('/')
    const html = await page.content()
    // No '@' next to a domain. The page does mention the sender domain
    // (pleasepleasepleasewater.me) in a few places, but never as an email.
    expect(html).not.toMatch(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i)
  })

  test('subscribe page email input is empty for a fresh visitor', async ({ page }) => {
    await page.goto('/settings')
    const input = page.getByLabel(/email/i)
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('')
  })
})
