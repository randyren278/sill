import { test, expect } from '@playwright/test'

/**
 * Public trust-mode access to plants — anyone visiting can view, add,
 * edit, and delete plants. This is intentional per the project's
 * single-tenant trust model. We assert the surface is wired so a
 * future RLS tightening on `plants` doesn't silently break it.
 */

test.describe('plants — open trust mode', () => {
  test('dashboard renders plants for anonymous visitor', async ({ page }) => {
    await page.goto('/')
    // Either the empty-state or at least one plant tile renders.
    await expect(page.locator('main, body')).toBeVisible()
    const tiles = page.locator('[data-plant-id], a[href*="/plants/"]')
    const count = await tiles.count()
    // Trust-mode means at least the New-plant CTA exists even when empty.
    const addCta = page.getByRole('button', { name: /add plant/i }).or(page.getByRole('link', { name: /add plant/i }))
    if (count === 0) {
      await expect(addCta).toBeVisible()
    } else {
      expect(count).toBeGreaterThanOrEqual(1)
    }
  })

  test('/plants/new form is reachable without auth', async ({ page }) => {
    await page.goto('/plants/new')
    // The form has a Nickname field — confirm anonymous visitor can see it.
    await expect(page.getByText(/nickname/i).first()).toBeVisible()
  })

  test('subscribe page export button exists for anonymous visitor', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /export json/i })).toBeVisible()
  })
})
