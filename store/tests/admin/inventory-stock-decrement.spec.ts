import { test, expect } from '@playwright/test'
import { fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp } from '../helpers/otp'
import { findColorOnlyVariant, getProductStock } from '../helpers/inventory'

/**
 * Regression coverage for BUG-003
 * (specs/001-e2e-test-suite/bugs/BUG-003-color-only-variant-stock-never-decrements.md).
 *
 * decrement_stock only updates variant_stock[color][size] when BOTH p_color
 * and p_size are non-sentinel ("_"). Products that track color but not size
 * always submit size="_" (the frontend never sets a size for size-less
 * products), so the guard can never pass and variant_stock is silently never
 * decremented — even though the aggregate stock_quantity decrements fine.
 *
 * Runs under the `admin` project purely to reach the admin products API for
 * before/after stock reads; the order itself is placed as an ordinary
 * customer would, in the same browser context (admin auth cookies don't
 * affect the storefront).
 */

test.describe('Inventory — color-only variant stock decrement', () => {
  test('ordering a color-only product decrements both stock_quantity and variant_stock[color]', async ({ page }) => {
    const target = await findColorOnlyVariant(page)
    test.skip(!target, 'no color-only product with available stock found in DB')
    const { productId, slug, color, stockQuantity: beforeStock, variantQuantity: beforeVariant } = target!

    await mockOtp(page)
    await page.goto(`/shop/${slug}`)

    const colorButton = page.getByRole('button', { name: color, exact: false })
    await colorButton.waitFor({ state: 'visible', timeout: 8_000 })
    await colorButton.click()

    await page.getByRole('button', { name: /Add to Cart/i }).click()
    await page.waitForTimeout(300)

    await page.goto('/checkout')
    await fillCheckoutForm(page)
    await completeOtp(page)

    const cod = page.getByText(/Cash on Delivery/i)
    test.skip(!(await cod.isVisible().catch(() => false)), 'COD payment option not available')
    await cod.click()

    await page.getByRole('button', { name: /Place Order/i }).click()
    await page.waitForURL(/\/order\/[0-9a-f-]{36}/, { timeout: 15_000 })
    await expect(page.getByText(/Order Placed!/i)).toBeVisible({ timeout: 8_000 })

    const after = await getProductStock(page, productId)
    expect(after).not.toBeNull()
    expect(after!.stockQuantity).toBe(beforeStock - 1)

    const afterVariant = after!.variantStock?.[color]?.['_']
    expect(afterVariant).toBe(beforeVariant - 1)
  })
})
