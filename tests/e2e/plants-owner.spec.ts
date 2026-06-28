import { test, expect } from '@playwright/test'
import { anonRest } from './helpers/supabase'

/**
 * Owner-mode mutation tests. We seed `localStorage.sill.owner` BEFORE any
 * page load via addInitScript, so the gated UI is visible from the first
 * paint. Each test exercises a real write through the new RPC path, then
 * cleans up after itself via the same RPC (no service-role escape hatch).
 *
 * Skips if OWNER_KEY isn't set — keeps the public suite green on machines
 * that don't have the secret.
 */

const OWNER_KEY = process.env.OWNER_KEY ?? ''

test.describe('plants — owner', () => {
  test.skip(!OWNER_KEY, 'set OWNER_KEY in .env.test.local to run owner specs')

  test.beforeEach(async ({ context }) => {
    await context.addInitScript((key) => {
      try {
        window.localStorage.setItem('sill.owner', key)
      } catch {
        /* private mode etc. */
      }
    }, OWNER_KEY)
  })

  test('owner sees the Add plant CTA + owner badge', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /add plant/i })).toBeVisible()
    await expect(page.getByLabel(/owner mode unlocked/i)).toBeVisible()
  })

  test('owner can create → water → delete a plant via the UI', async ({ page }) => {
    const nickname = 'e2e-owner-' + Date.now()

    // CREATE
    await page.goto('/plants/new')
    await expect(page.getByText(/nickname/i).first()).toBeVisible()
    await page
      .locator('input[placeholder*="Monstera"]')
      .fill(nickname)
    await page.getByRole('button', { name: /add to my plants/i }).click()
    await expect(page).toHaveURL(/\/$/)

    // The tile lands on the dashboard. PlantRow renders a div with
    // data-plant-id and a click handler — not an <a>.
    const tile = page.locator('[data-plant-id]', { hasText: nickname }).first()
    await expect(tile).toBeVisible({ timeout: 8000 })

    // WATER — open the detail page first, then click Water now.
    await tile.click()
    await expect(page).toHaveURL(/\/plants\//)
    await expect(page.getByRole('button', { name: /water now/i })).toBeVisible()
    await page.getByRole('button', { name: /water now/i }).click()
    await expect(page.getByText(/^Watered /i)).toBeVisible({ timeout: 5000 })

    // DELETE
    await page.getByRole('button', { name: /^delete$/i }).click()
    // ConfirmDialog has its own "Delete" button.
    await page.getByRole('button', { name: /^delete$/i }).last().click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('[data-plant-id]', { hasText: nickname })).toHaveCount(0)
  })

  test('wrong owner key surfaces a clear error', async ({ context, page }) => {
    // Override the beforeEach seed with a bogus value.
    await context.addInitScript(() => {
      try { window.localStorage.setItem('sill.owner', 'wrong-key-' + Date.now()) } catch { /* ok */ }
    })
    await page.goto('/plants/new')
    await page
      .locator('input[placeholder*="Monstera"]')
      .fill('e2e-bad-' + Date.now())
    await page.getByRole('button', { name: /add to my plants/i }).click()
    // The friendly toast from surfaceWriteError maps 42501 → this message.
    await expect(page.getByText(/wrong owner password/i)).toBeVisible({ timeout: 5000 })
  })

  test('DB unlock: plant_upsert RPC accepts the real owner key', async () => {
    // Belt-and-braces: even with no browser involved, the RPC path is open
    // for the real key. This is the inverse of the unauthorized check in
    // plants-public.spec.ts — together they pin down that the lock checks
    // the key and nothing else.
    const tempId = 'e2e-rpc-' + Date.now()
    try {
      const upsert = await anonRest.rpc('plant_upsert', {
        p_key: OWNER_KEY,
        p_plant: {
          id: tempId,
          name: 'rpc temp', loc: 'test', latin: 'Test', common: 'RPC Test',
          light: 'medium', freq_days: 7, arch: 'broad', greens: 'forest',
          size: 'sm', fact: 'temp', notes: '',
          last_watered: '2026-01-01', history: [],
        },
      })
      expect(upsert.status).toBeLessThan(300)
    } finally {
      await anonRest.rpc('plant_remove', { p_key: OWNER_KEY, p_id: tempId })
    }
  })
})
