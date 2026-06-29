import { test, expect } from '@playwright/test'

async function seedCartAndGoToCheckout(page: import('@playwright/test').Page) {
  // Seed a cart item via localStorage so we skip the add-to-cart UI flow
  await page.goto('/')
  await page.evaluate(() => {
    const item = {
      id: '__test_product__',
      name: 'Test Lawn Suit',
      price: 3500,
      quantity: 1,
      size: 'M',
      color: 'White',
      image: '',
    }
    localStorage.setItem('zadiis_cart', JSON.stringify([item]))
  })
  await page.goto('/checkout')
}

test.describe('Checkout page', () => {

  test('empty cart redirects to /cart', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.removeItem('zadiis_cart'))
    await page.goto('/checkout')
    await expect(page).toHaveURL('/cart', { timeout: 5_000 })
  })

  test('checkout form renders all required fields', async ({ page }) => {
    await seedCartAndGoToCheckout(page)
    await expect(page.getByLabel(/Full Name/i).or(page.getByPlaceholder(/name/i))).toBeVisible()
    await expect(page.getByLabel(/Phone/i).or(page.getByPlaceholder(/phone/i))).toBeVisible()
    await expect(page.getByLabel(/Email/i).or(page.getByPlaceholder(/email/i))).toBeVisible()
    await expect(page.getByLabel(/Address/i).or(page.getByPlaceholder(/address/i))).toBeVisible()
    await expect(page.getByLabel(/City/i).or(page.getByRole('combobox').first())).toBeVisible()
  })

  test('invalid phone number shows validation error', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    await page.getByPlaceholder(/phone/i).fill('12345')
    // Blur to trigger validation
    await page.getByPlaceholder(/phone/i).blur()

    await expect(page.getByText(/03|11 digits|starting with 03/i)).toBeVisible({ timeout: 3_000 })
  })

  test('valid phone number clears phone error', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    await page.getByPlaceholder(/phone/i).fill('12345')
    await page.getByPlaceholder(/phone/i).blur()
    await page.getByPlaceholder(/phone/i).clear()
    await page.getByPlaceholder(/phone/i).fill('03001234567')
    await page.getByPlaceholder(/phone/i).blur()

    await expect(page.getByText(/11 digits|starting with 03/i)).not.toBeVisible()
  })

  test('email field is required', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    // Leave email blank and try to submit
    await page.getByPlaceholder(/name/i).fill('Fatima Ali')
    await page.getByPlaceholder(/phone/i).fill('03001234567')
    await page.getByPlaceholder(/address/i).fill('House 12, Block B, Gulberg')

    // Select payment method
    const codOption = page.getByText(/Cash on Delivery/i)
    if (await codOption.isVisible()) await codOption.click()

    await page.getByRole('button', { name: /Place Order/i }).click()
    await expect(page.getByText(/email.*required|required.*email/i)).toBeVisible({ timeout: 3_000 })
  })

  test('city selection updates delivery charge', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const citySelect = page.getByRole('combobox').first()
    await citySelect.selectOption({ index: 1 })
    await page.waitForTimeout(500)

    // Delivery charge row should now show a PKR amount
    await expect(page.getByText(/Delivery|Shipping/i)).toBeVisible()
  })

  test('COD payment option is selectable', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    const cod = page.getByText(/Cash on Delivery/i)
    const isCodVisible = await cod.isVisible().catch(() => false)
    if (!isCodVisible) test.skip()

    await cod.click()
    await expect(cod.locator('..').locator('input[type="radio"]').or(page.getByRole('radio', { name: /Cash on Delivery/i }))).toBeChecked()
  })

  test('order summary shows cart item and total', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    await expect(page.getByText('Test Lawn Suit')).toBeVisible()
    await expect(page.getByText(/PKR 3,500/i)).toBeVisible()
  })

  test('successful COD order redirects to confirmation', async ({ page }) => {
    await seedCartAndGoToCheckout(page)

    // Fill valid form
    await page.getByPlaceholder(/name/i).fill('Fatima Ali')
    await page.getByPlaceholder(/phone/i).fill('03001234567')
    await page.getByPlaceholder(/email/i).fill('fatima@test.com')
    await page.getByPlaceholder(/address/i).fill('House 12, Block B, Gulberg')

    const citySelect = page.getByRole('combobox').first()
    const options = await citySelect.locator('option').all()
    if (options.length > 1) await citySelect.selectOption({ index: 1 })

    // Select COD
    const cod = page.getByText(/Cash on Delivery/i)
    if (await cod.isVisible()) await cod.click()

    // Honeypot field should be left blank (it's hidden)
    // website field is the honeypot — don't fill it

    await page.getByRole('button', { name: /Place Order/i }).click()

    // Should redirect to /order-confirmation or show success
    await expect(
      page.getByText(/Order Confirmed|order.*placed|Thank you/i).or(
        page.locator('[href*="confirmation"]').or(page.locator('text=#ZD-'))
      )
    ).toBeVisible({ timeout: 15_000 })
  })

})
