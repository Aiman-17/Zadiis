import { test, expect } from '@playwright/test'

// Row markup: <div class="flex items-center justify-between"> <div><p>Label</p><p>Desc</p></div> <button>...</button> </div>
// The label/description live two levels below the row — walk up from the
// label paragraph to the row, then find the button as a sibling. A plain
// `div.filter({ hasText }).last()` resolves to the *innermost* matching div
// (the text wrapper, which has no button descendant), not the row.
function toggleFor(page: import('@playwright/test').Page, label: string) {
  return page.getByText(label, { exact: true }).locator('xpath=../..').getByRole('button')
}

// These toggles write to the SAME store_settings table the live storefront
// reads from (no isolated test database) — a restore step placed only at
// the end of the test body gets skipped if an earlier assertion throws,
// leaving the live site in the disabled state. afterEach runs regardless of
// pass/fail, so it's the only reliable place to guarantee cleanup. Restoring
// directly via the settings API (not a UI click) makes cleanup independent
// of whatever broke in the test body above it.
test.afterEach(async ({ request }) => {
  await request.post('/api/admin/settings', { data: { key: 'free_delivery_enabled', value: 'true' } })
  await request.post('/api/admin/settings', { data: { key: 'cancellations_enabled', value: 'true' } })
})

test.describe('Admin — Store Policy Toggles (US3 free delivery, US4 cancellations)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/settings')
  })

  test('free delivery and cancellation toggles render with default-enabled state', async ({ page }) => {
    await expect(page.getByText('Free Delivery on 5+ Items')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Self-Service Cancellations')).toBeVisible()
  })

  test('disabling free delivery removes it from checkout eligibility and homepage copy', async ({ page }) => {
    const freeDeliveryToggle = toggleFor(page, 'Free Delivery on 5+ Items')
    await expect(freeDeliveryToggle).toBeVisible({ timeout: 8_000 })

    const wasEnabled = await freeDeliveryToggle.evaluate(el =>
      (el as HTMLElement).style.backgroundColor.includes('28, 28, 28') // #1C1C1C rgb
    )
    // Ensure clean starting state, then disable — wait for each POST to
    // actually resolve before proceeding, not a fixed sleep.
    const clickAndWait = () => Promise.all([
      page.waitForResponse(r => r.url().includes('/api/admin/settings') && r.request().method() === 'POST'),
      freeDeliveryToggle.click(),
    ])
    if (!wasEnabled) await clickAndWait()
    await clickAndWait()

    // Homepage no longer advertises free delivery
    await page.goto('/')
    await expect(page.getByText('Free delivery on orders of 5+ items')).not.toBeVisible({ timeout: 5_000 })
  })

  test('disabling cancellations hides the footer link and blocks the cancel page', async ({ page }) => {
    const cancelToggle = toggleFor(page, 'Self-Service Cancellations')
    await expect(cancelToggle).toBeVisible({ timeout: 8_000 })
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/admin/settings') && r.request().method() === 'POST'),
      cancelToggle.click(),
    ])

    await page.goto('/')
    await expect(page.getByRole('link', { name: /cancel an order/i })).not.toBeVisible({ timeout: 5_000 })

    await page.goto('/cancel-order')
    await expect(page.getByRole('heading', { name: /currently unavailable/i })).toBeVisible({ timeout: 5_000 })
  })
})
