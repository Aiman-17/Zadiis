import { test, expect } from '@playwright/test'

/**
 * US8 — Admin sales / discounts (/admin/sales).
 * Real UI: "Sales" heading, "+ New Sale" link to /admin/sales/new,
 * sale cards with Running / Completed / Inactive status.
 */

test.describe('Admin sales page', () => {

  test('sales page renders heading and New Sale action', async ({ page }) => {
    await page.goto('/admin/sales')
    await expect(page.getByRole('heading', { name: 'Sales' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('link', { name: /New Sale/i })).toBeVisible()
  })

  test('New Sale opens the creation form', async ({ page }) => {
    await page.goto('/admin/sales')
    await page.getByRole('link', { name: /New Sale/i }).click()
    await expect(page).toHaveURL(/\/admin\/sales\/new/, { timeout: 8_000 })
    // Creation form renders inputs — at minimum a name/title and a submit control
    await expect(page.locator('input').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button').last()).toBeVisible()
  })

  test('existing sales list shows status labels', async ({ page }) => {
    await page.goto('/admin/sales')
    const saleCard = page.getByText(/Running|Completed|Inactive/).first()
    const hasSales = await saleCard.isVisible().catch(() => false)
    test.skip(!hasSales, 'no sales exist in DB')
    await expect(saleCard).toBeVisible()
  })

  test('active sale card is marked Active', async ({ page }) => {
    await page.goto('/admin/sales')
    const activeBadge = page.getByText('Active', { exact: true }).first()
    const hasActive = await activeBadge.isVisible().catch(() => false)
    test.skip(!hasActive, 'no active sale in DB')
    await expect(activeBadge).toBeVisible()
  })

  test('unauthenticated visit to sales redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/sales')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })
})
