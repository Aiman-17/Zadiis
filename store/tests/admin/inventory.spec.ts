import { test, expect } from '@playwright/test'

/**
 * US10 — Inventory management inside the product edit page
 * (/admin/products/[id]/edit). Real UI: "Stock" quantity field and a
 * "Variant Stock" grid (per color/size) rendered by VariantStockGrid.
 * Read-only assertions — stock values are never saved by these tests.
 */

test.describe('Admin inventory (product edit)', () => {

  async function openFirstProductEdit(page: import('@playwright/test').Page): Promise<boolean> {
    await page.goto('/admin/products')
    const editLink = page.locator('a[href*="/admin/products/"][href*="/edit"]').first()
    if (!(await editLink.isVisible().catch(() => false))) return false
    await editLink.click()
    await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 8_000 })
    return true
  }

  test('product edit page shows stock quantity field', async ({ page }) => {
    const opened = await openFirstProductEdit(page)
    test.skip(!opened, 'no products in DB to edit')

    await expect(page.locator('#stock').or(page.getByLabel(/stock/i)).first()).toBeVisible({ timeout: 8_000 })
  })

  test('variant stock section is present', async ({ page }) => {
    const opened = await openFirstProductEdit(page)
    test.skip(!opened, 'no products in DB to edit')

    await expect(
      page.getByText('Variant Stock').or(page.getByText(/per-variant stock/i)).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('stock quantity input is editable', async ({ page }) => {
    const opened = await openFirstProductEdit(page)
    test.skip(!opened, 'no products in DB to edit')

    const stockInput = page.locator('#stock').first()
    const visible = await stockInput.isVisible().catch(() => false)
    test.skip(!visible, 'stock field auto-calculated from variants (manual input hidden)')
    // With variant tracking, #stock is a read-only <div> showing the auto sum
    // (EditProductForm.tsx) — only the manual <Input id="stock"> is editable.
    const isInput = await stockInput.evaluate((el) => el.tagName === 'INPUT').catch(() => false)
    test.skip(!isInput, 'stock auto-calculated from variant grid (read-only display)')
    await expect(stockInput).toBeEditable()
  })

  test('products list shows stock information', async ({ page }) => {
    await page.goto('/admin/products')
    const hasProducts = await page
      .locator('a[href*="/admin/products/"][href*="/edit"]')
      .first()
      .isVisible()
      .catch(() => false)
    test.skip(!hasProducts, 'no products in DB')

    await expect(page.getByText(/stock|sold out|in stock/i).first()).toBeVisible({ timeout: 8_000 })
  })
})
