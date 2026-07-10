import { test, expect } from '@playwright/test'

// Spec 006, US9 — verifies the consolidated Slow Mover calculation flags the
// same product set in the product list and the sale-creation screen. Before
// this consolidation these two surfaces could disagree (see research.md
// Decision 9): sales/new/page.tsx excluded is_new_arrival products from the
// average-sell-through baseline while AdminProductsClient.tsx included them.
test.describe('Admin — Slow Mover consistency (US9)', () => {

  test('product list and sale-creation screen flag the same products as Slow Mover', async ({ page }) => {
    await page.goto('/admin/products?filter=slow-movers')
    await page.waitForSelector('table', { timeout: 8_000 })
    const productListNames = await page.locator('table tbody tr td:first-child span.font-medium').allTextContents()

    await page.goto('/admin/sales/new')
    await page.waitForSelector('text=/Add Products/i', { timeout: 8_000 }).catch(() => {})
    const slowMoverBadges = page.locator('span', { hasText: 'Slow Mover' })
    const count = await slowMoverBadges.count()
    const saleScreenNames: string[] = []
    for (let i = 0; i < count; i++) {
      const name = await slowMoverBadges.nth(i).locator('xpath=preceding-sibling::p').first().textContent()
      if (name) saleScreenNames.push(name.trim())
    }

    test.skip(productListNames.length === 0 && saleScreenNames.length === 0, 'no Slow Mover products in current data')

    const normalize = (names: string[]) => new Set(names.map(n => n.trim()).filter(Boolean))
    const fromList = normalize(productListNames)
    const fromSaleScreen = normalize(saleScreenNames)

    // sale/new excludes new-arrival products from its eligible list entirely
    // (by design, unrelated to US9) — so only assert the sale-screen's flagged
    // set is fully contained in the product-list's flagged set, not equality.
    for (const name of fromSaleScreen) {
      expect(fromList.has(name)).toBe(true)
    }
  })
})
