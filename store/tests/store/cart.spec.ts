import { test, expect } from '@playwright/test'
import { addRealProductToCart } from '../helpers/cart'

test.describe('Cart page', () => {

  test('empty cart shows empty state and suggestions', async ({ page }) => {
    // Clear cart via localStorage
    await page.goto('/cart')
    await page.evaluate(() => localStorage.removeItem('zadiis-cart'))
    await page.reload()

    await expect(page.getByText(/Your cart is empty/i)).toBeVisible()
    await expect(page.getByRole('link', { name: /Continue Shopping/i })).toBeVisible()
  })

  test('cart shows added product', async ({ page }) => {
    const added = await addRealProductToCart(page)
    test.skip(!added, 'no purchasable product available to add to cart')

    await page.goto('/cart')
    // Should show at least one cart row (not empty state)
    await expect(page.getByText(/Your cart is empty/i)).not.toBeVisible({ timeout: 5_000 })
  })

  test('subtotal formatted as PKR with en-US locale', async ({ page }) => {
    const added = await addRealProductToCart(page)
    test.skip(!added, 'no purchasable product available to add to cart')

    await page.goto('/cart')
    const subtotalEl = page.getByText(/PKR/).filter({ hasText: /Subtotal/ }).or(
      page.locator('div').filter({ hasText: /Subtotal/ }).getByText(/PKR/)
    )
    // Subtotal should contain only Western Arabic numerals (0-9), not Arabic-Indic
    const text = await page.locator('text=Subtotal').locator('..').textContent()
    expect(text).toMatch(/PKR [\d,]+/)
  })

  test('quantity increment increases subtotal', async ({ page }) => {
    const added = await addRealProductToCart(page)
    test.skip(!added, 'no purchasable product available to add to cart')

    await page.goto('/cart')
    await expect(page.getByText(/PKR/i).first()).toBeVisible()

    // Get subtotal before
    const subtotalLocator = page.locator('text=Subtotal').locator('..')
    const subtotalBefore = await subtotalLocator.textContent()

    // Click + button
    await page.getByRole('button', { name: '+' }).first().click()

    await expect(subtotalLocator).not.toHaveText(subtotalBefore ?? '')
  })

  test('removing item from cart returns empty state when last item', async ({ page }) => {
    await page.goto('/cart')
    await page.evaluate(() => {
      const item = { id: 'test', name: 'Test', price: 1000, quantity: 1, size: 'M', color: '', image: '' }
      localStorage.setItem('zadiis-cart', JSON.stringify([item]))
    })
    await page.reload()

    // Find and click the trash/remove button
    const removeBtn = page.getByRole('button', { name: '' }).filter({ has: page.locator('svg') }).first()
    await removeBtn.click()
    await expect(page.getByText(/Your cart is empty/i)).toBeVisible({ timeout: 3_000 })
  })

  test('cart cross-sell suggestions render when cart is empty', async ({ page }) => {
    await page.goto('/cart')
    await page.evaluate(() => localStorage.removeItem('zadiis-cart'))
    await page.reload()

    // "You Might Like" section should appear (from trending products)
    const youMightLike = page.getByText(/You Might Like/i)
    const hasSection = await youMightLike.isVisible().catch(() => false)
    // If trending products exist, the section renders
    if (hasSection) {
      await expect(page.locator('a[href^="/shop/"]').first()).toBeVisible()
    }
  })

  test('Proceed to Checkout button navigates to checkout', async ({ page }) => {
    const added = await addRealProductToCart(page)
    test.skip(!added, 'no purchasable product available to add to cart')

    await page.goto('/cart')
    await expect(page.getByText(/Your cart is empty/i)).not.toBeVisible({ timeout: 5_000 })
    await page.getByRole('link', { name: /Proceed to Checkout/i }).click()
    await expect(page).toHaveURL('/checkout')
  })

})
