import { test, expect } from '@playwright/test'
import { anonRest } from './helpers/supabase'

/**
 * Plant writes are LOCKED to the owner. Anyone can view; nobody but the
 * owner can mutate. These assertions probe both the UI (hidden CTAs,
 * route guards) and the DB (RLS / RPC unauthorized) so a future regression
 * that lifts either layer is caught immediately.
 */

test.describe('plants — visitor (locked)', () => {
  test('header hides the Add plant CTA for anonymous visitors', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /add plant/i })).toHaveCount(0)
  })

  test('dashboard hides the Water-all CTA for anonymous visitors', async ({ page }) => {
    await page.goto('/')
    // The button is conditional on dueIds.length > 0 even for the owner, so we
    // only assert that no version of it is visible right now (covers both the
    // "0 due" and "locked" cases without flaking on the live plant state).
    await expect(page.getByRole('button', { name: /water \d+ due/i })).toHaveCount(0)
  })

  test('/plants/new redirects anonymous visitors to /', async ({ page }) => {
    await page.goto('/plants/new')
    await expect(page).toHaveURL(/\/$/)
    // And the Nickname field from PlantForm must NOT be reachable.
    await expect(page.getByText(/nickname/i)).toHaveCount(0)
  })

  test('plant detail hides Water/Edit/Delete for anonymous visitors', async ({ page }) => {
    await page.goto('/')
    const firstTile = page.locator('a[href*="/plants/"], [data-plant-id]').first()
    // Plants load from Supabase via PlantsProvider's useEffect — wait a moment
    // before deciding there are none.
    await firstTile.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {})
    const count = await firstTile.count()
    test.skip(count === 0, 'no plants in the live DB to drill into')
    await firstTile.click()
    await expect(page).toHaveURL(/\/plants\//)
    await expect(page.getByRole('button', { name: /water now/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^edit$/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^delete$/i })).toHaveCount(0)
  })

  test('subscribe page export button still works for anonymous visitors', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /export json/i })).toBeVisible()
  })

  test('/owner page is reachable and shows the password input', async ({ page }) => {
    await page.goto('/owner')
    await expect(page.getByLabel(/owner password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /unlock/i })).toBeVisible()
  })

  test('DB lock: plant_upsert RPC rejects wrong owner key', async () => {
    // Direct REST → RPC. With a bogus key, the SECURITY DEFINER function must
    // raise 42501 (Postgrest surfaces it as HTTP 400+ depending on version,
    // and the error body carries the SQLSTATE).
    const { status, body } = await anonRest.rpc('plant_upsert', {
      p_key: 'definitely-wrong',
      p_plant: {
        id: 'visitor-attempt-' + Date.now(),
        name: 'x', loc: 'x', latin: 'x', common: 'x', light: 'x',
        freq_days: 7, arch: 'broad', greens: 'forest', size: 'sm', fact: 'x',
        notes: '', last_watered: '2026-01-01', history: [],
      },
    })
    expect(status).toBeGreaterThanOrEqual(400)
    const msg = JSON.stringify(body).toLowerCase()
    expect(msg).toMatch(/unauthorized|42501/)
  })

  test('DB lock: plant_remove RPC rejects wrong owner key', async () => {
    const { status, body } = await anonRest.rpc('plant_remove', {
      p_key: 'definitely-wrong',
      p_id: 'whatever',
    })
    expect(status).toBeGreaterThanOrEqual(400)
    const msg = JSON.stringify(body).toLowerCase()
    expect(msg).toMatch(/unauthorized|42501/)
  })
})
