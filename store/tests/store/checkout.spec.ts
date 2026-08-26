import { test, expect } from '@playwright/test'
import { seedCartAndGoToCheckout, addRealProductToCart, fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp } from '../helpers/otp'

test.describe('Checkout page', () => {

  test('empty cart redirects to /cart', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('zadiis-cart'))
    await page.goto('/checkout')
    await expect(page).toHaveURL('/cart', { timeout: 5_000 })
  })

  test('checkout form renders all required fields', async ({ page }) => {
    await seedCartAndGoToCheckout(page)
    // Checkout fields expose accessible names via <label htmlFor>, not placeholders.
    await expect(page.getByRole('textbox', { name: /full name/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /phone/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
    await expect(page.getByRole('textbox', { name: /address/i })).toBeVisible()
    await expect(page.getByRole('combobox', { name: /city/i })).toBeVisible()
  })

  test('invalid phone number shows validation error', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const phone = page.getByRole('textbox', { name: /phone/i })
    await phone.fill('12345')
    // Blur to trigger validation
    await phone.blur()

    await expect(page.getByText(/03|11 digits|starting with 03/i)).toBeVisible({ timeout: 3_000 })
  })

  test('valid phone number clears phone error', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const phone = page.getByRole('textbox', { name: /phone/i })
    await phone.fill('12345')
    await phone.blur()
    await phone.clear()
    await phone.fill('03001234567')
    await phone.blur()

    await expect(page.getByText(/11 digits|starting with 03/i)).not.toBeVisible()
  })

  test('email field is required', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    // Leave email blank and try to submit
    await page.getByRole('textbox', { name: /full name/i }).fill('Fatima Ali')
    await page.getByRole('textbox', { name: /phone/i }).fill('03001234567')
    await page.getByRole('textbox', { name: /address/i }).fill('House 12, Block B, Gulberg')

    // Select payment method
    const codOption = page.getByText(/Cash on Delivery/i)
    if (await codOption.isVisible()) await codOption.click()

    await page.getByRole('button', { name: /Place Order/i }).click()

    // The email input carries the HTML `required` attribute, so the browser's
    // native constraint validation blocks submission before any React handler
    // runs — there is no custom "email is required" string in the DOM to find.
    // Assert the real behavior instead: the field is flagged invalid and the
    // page never navigates away from checkout (no order was placed).
    const email = page.getByRole('textbox', { name: /email/i })
    const isValid = await email.evaluate((el: HTMLInputElement) => el.validity.valid)
    expect(isValid).toBe(false)
    await expect(page).toHaveURL('/checkout', { timeout: 8_000 })
  })

  test('city selection updates delivery charge', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const citySelect = page.getByRole('combobox', { name: /city/i })
    const options = await citySelect.locator('option').all()
    test.skip(options.length <= 1, 'no delivery zones configured')
    await citySelect.selectOption({ index: 1 })

    // Selecting a city reveals "Delivery charge: PKR <amount>" under the select
    await expect(page.getByText(/Delivery charge: PKR [\d,]+/i)).toBeVisible()
  })

  test('COD payment option is selectable', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const cod = page.getByText(/Cash on Delivery/i)
    const isCodVisible = await cod.isVisible().catch(() => false)
    test.skip(!isCodVisible, 'COD payment option not available')

    await cod.click()
    await expect(cod.locator('..').locator('input[type="radio"]').or(page.getByRole('radio', { name: /Cash on Delivery/i }))).toBeChecked()
  })

  test('order summary shows cart item and total', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    await expect(page.getByText('Test Lawn Suit')).toBeVisible()
    // "PKR 3,500" appears 3× (item line, Subtotal, Total = no delivery yet) —
    // assert the first; strict mode rejects the bare locator.
    await expect(page.getByText(/PKR 3,500/i).first()).toBeVisible()
  })

  test('successful COD order redirects to confirmation', async ({ page }) => {
    // POST /api/orders validates products against the DB — the fake seeded
    // item is rejected with 400 "Product not found", so this test must add a
    // REAL product via the shop UI and complete the mandatory email OTP step.
    await mockOtp(page)
    const productName = await addRealProductToCart(page)
    test.skip(!productName, 'no purchasable products in DB')
    await page.goto('/checkout')

    await fillCheckoutForm(page)
    await completeOtp(page)

    const cod = page.getByText(/Cash on Delivery/i)
    test.skip(!(await cod.isVisible().catch(() => false)), 'COD payment option not available')
    await cod.click()

    await page.getByRole('button', { name: /Place Order/i }).click()

    // Should redirect to /order/[id]
    await page.waitForURL(/\/order\/[0-9a-f-]{36}/, { timeout: 15_000 })
    await expect(page.getByText(/Order Placed!/i)).toBeVisible({ timeout: 8_000 })
  })

})
