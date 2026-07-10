import { test, expect } from '@playwright/test'
import { addRealProductToCart, fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp } from '../helpers/otp'

/**
 * US3 — Order confirmation page at /order/[id] (UUID).
 *
 * The first test places one real COD order (clearly-marked E2E test data)
 * using a REAL product from the shop — POST /api/orders validates products
 * against the DB, so the fake seeded item cannot be ordered. The remaining
 * tests revisit the captured confirmation URL. Serial mode keeps that safe.
 */

test.describe.serial('Order confirmation page', () => {
  let confirmationUrl: string | null = null
  let customerName: string
  let productName: string | null = null

  test('COD order redirects to /order/[id] with a ZD- order number', async ({ page }) => {
    await mockOtp(page)
    productName = await addRealProductToCart(page)
    test.skip(!productName, 'no purchasable products in DB')
    await page.goto('/checkout')

    const data = await fillCheckoutForm(page)
    customerName = data.name
    await completeOtp(page)

    const cod = page.getByText(/Cash on Delivery/i)
    test.skip(!(await cod.isVisible().catch(() => false)), 'COD payment option not available')
    await cod.click()

    await page.getByRole('button', { name: /Place Order/i }).click()

    await page.waitForURL(/\/order\/[0-9a-f-]{36}/, { timeout: 15_000 })
    confirmationUrl = page.url()

    await expect(page.getByText(/Order Placed!/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/ZD-/).first()).toBeVisible()
  })

  test('confirmation shows customer name', async ({ page }) => {
    test.skip(!confirmationUrl, 'order placement test did not produce a confirmation URL')
    await page.goto(confirmationUrl!)
    await expect(page.getByText(new RegExp(customerName, 'i'))).toBeVisible({ timeout: 8_000 })
  })

  test('confirmation shows the ordered item', async ({ page }) => {
    test.skip(!confirmationUrl, 'order placement test did not produce a confirmation URL')
    await page.goto(confirmationUrl!)
    await expect(page.getByText(productName!, { exact: false }).first()).toBeVisible({ timeout: 8_000 })
  })

  test('confirmation shows payment method', async ({ page }) => {
    test.skip(!confirmationUrl, 'order placement test did not produce a confirmation URL')
    await page.goto(confirmationUrl!)
    await expect(
      page.getByText(/Cash on Delivery/i).or(page.getByText(/COD/i)).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('WhatsApp contact link is present', async ({ page }) => {
    test.skip(!confirmationUrl, 'order placement test did not produce a confirmation URL')
    await page.goto(confirmationUrl!)
    await expect(page.locator('a[href*="wa.me"]').first()).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Order confirmation — negative paths', () => {
  test('unknown order UUID shows not-found message, no data leak', async ({ page }) => {
    await page.goto('/order/00000000-0000-0000-0000-000000000000')
    await expect(page.getByText(/Order not found/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/ZD-/)).not.toBeVisible()
  })
})
