import { test, expect } from '@playwright/test'

/**
 * US9 + US12 — Admin settings and delivery zones (/admin/settings).
 * Real UI: "Settings" heading, "Delivery Zones" section with per-city charges
 * and an Add City form (placeholders "Lahore" / "250"), "Payment Settings"
 * section. Mutating actions are asserted via UI state only — no test may
 * leave changed settings behind.
 */

test.describe('Admin settings page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings')
  })

  test('settings page renders heading and sections', async ({ page }) => {
    // exact: true — 'Payment Settings' also matches a substring 'Settings'
    await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'Delivery Zones' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Payment Settings' })).toBeVisible()
  })

  test('delivery zones section lists city charge inputs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery Zones' })).toBeVisible({ timeout: 8_000 })
    // Add City form is always present
    await expect(page.getByPlaceholder('Lahore')).toBeVisible()
    await expect(page.getByPlaceholder('250')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Add City' })).toBeVisible()
  })

  test('existing city charge input is editable', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery Zones' })).toBeVisible({ timeout: 8_000 })
    // Zone rows load async from /api/admin/delivery-zones
    const zoneInput = page.locator('input[type="number"]').first()
    const hasZones = await zoneInput.isVisible().catch(() => false)
    test.skip(!hasZones, 'no delivery zones configured in DB')
    await expect(zoneInput).toBeEditable()
  })

  test('duplicate city is rejected client-side with alert', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery Zones' })).toBeVisible({ timeout: 8_000 })

    // Read the first existing zone's city name from the section; skip if none
    const zoneSection = page.locator('section, div').filter({ has: page.getByRole('heading', { name: 'Delivery Zones' }) }).first()
    const cityText = await zoneSection.locator('text=/^[A-Z][a-z]+$/').first().textContent().catch(() => null)
    test.skip(!cityText, 'no existing zone city to duplicate')

    let alerted = false
    page.on('dialog', async (d) => { alerted = true; await d.accept() })

    await page.getByPlaceholder('Lahore').fill(cityText!)
    await page.getByPlaceholder('250').fill('123')
    await page.getByRole('button', { name: 'Add City' }).click()
    expect(alerted).toBe(true)
  })

  test('removing a city asks for confirmation first', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Delivery Zones' })).toBeVisible({ timeout: 8_000 })
    const removeBtn = page.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-x)').first()
    const hasZones = await removeBtn.isVisible().catch(() => false)
    test.skip(!hasZones, 'no delivery zones to exercise remove on')

    let confirmShown = false
    page.on('dialog', async (dialog) => {
      confirmShown = dialog.type() === 'confirm'
      await dialog.dismiss() // never actually delete
    })
    await removeBtn.click()
    expect(confirmShown).toBe(true)
  })

  test('unauthenticated visit to settings redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/settings')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })
})
