import { test, expect } from '@playwright/test'

// Helper: get the slug of the first product visible in the shop
async function getFirstProductSlug(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/shop')
  await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
  const href = await page.locator('a[href^="/shop/"]').first().getAttribute('href')
  if (!href) throw new Error('No product cards found')
  return href
}

test.describe('Product detail page', () => {

  test('renders product name and price', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    // h1 is the product name
    await expect(page.locator('h1').first()).toBeVisible()
    // Price shown as PKR amount
    await expect(page.getByText(/PKR/i).first()).toBeVisible()
  })

  test('Back to Shop link navigates correctly', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    await page.getByRole('link', { name: /Back to Shop/i }).click()
    await expect(page).toHaveURL('/shop')
  })

  test('product image gallery renders', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    await expect(page.locator('img').first()).toBeVisible({ timeout: 8_000 })
  })

  test('size selector and add to cart flow', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)

    // If size selector exists, pick first option
    const sizeButtons = page.getByRole('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Unstitched)$/i })
    const hasSizes = await sizeButtons.first().isVisible().catch(() => false)
    if (hasSizes) {
      await sizeButtons.first().click()
    }

    // Add to Cart button should be present and enabled (unless sold out)
    const addBtn = page.getByRole('button', { name: /Add to Cart/i }).or(
      page.getByRole('button', { name: /Sold Out/i })
    )
    await expect(addBtn.first()).toBeVisible()
  })

  test('add to cart updates header cart count', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)

    const addBtn = page.getByRole('button', { name: /Add to Cart/i })
    const isAddable = await addBtn.isVisible().catch(() => false)
    if (!isAddable) test.skip() // product is sold out

    // Pick a size if required
    const sizeButtons = page.getByRole('button').filter({ hasText: /^(XS|S|M|L|XL|XXL|Unstitched)$/i })
    if (await sizeButtons.first().isVisible().catch(() => false)) {
      await sizeButtons.first().click()
    }

    await addBtn.click()

    // Cart badge in header should show ≥ 1
    const cartBadge = page.locator('a[href="/cart"]').getByText(/[1-9]/)
    await expect(cartBadge).toBeVisible({ timeout: 3_000 })
  })

  test('sold-out product shows Sold Out overlay and Notify Me button', async ({ page }) => {
    // Navigate to shop and look for a sold-out card (the overlay is visible)
    await page.goto('/shop')
    const soldOutOverlay = page.getByText('Sold Out').first()
    const hasSoldOut = await soldOutOverlay.isVisible().catch(() => false)
    if (!hasSoldOut) test.skip()

    // Click the sold-out product card
    const soldOutCard = page.locator('a[href^="/shop/"]').filter({ has: page.getByText('Sold Out') }).first()
    await soldOutCard.click()

    // Product page should show out-of-stock messaging
    await expect(
      page.getByText(/Out of Stock/i).or(page.getByRole('button', { name: /Notify Me/i }))
    ).toBeVisible()
  })

  test('last chance product shows urgency text', async ({ page }) => {
    await page.goto('/shop?tab=last-chance')
    const hasProducts = await page.locator('a[href^="/shop/"]').first().isVisible().catch(() => false)
    if (!hasProducts) test.skip()

    const firstCard = page.locator('a[href^="/shop/"]').first()
    const href = await firstCard.getAttribute('href')
    await page.goto(href!)

    await expect(
      page.getByText(/Almost Gone|Final Stock|Only \d+ left/i)
    ).toBeVisible()
  })

  test('sale product shows discounted price and savings', async ({ page }) => {
    await page.goto('/sale').catch(() => null)
    const hasSalePage = await page.locator('a[href^="/shop/"]').first().isVisible().catch(() => false)
    if (!hasSalePage) test.skip()

    const firstProduct = page.locator('a[href^="/shop/"]').first()
    const href = await firstProduct.getAttribute('href')
    await page.goto(href!)

    // Both original and discounted price should be visible
    const prices = page.getByText(/PKR/i)
    await expect(prices.first()).toBeVisible()
    await expect(page.getByText(/Save PKR|-%/i)).toBeVisible()
  })

  test('related products section renders', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)

    const related = page.getByRole('heading', { name: /You May Also Like/i })
    // Only present if related products exist for same category
    const hasRelated = await related.isVisible().catch(() => false)
    if (hasRelated) {
      await expect(page.locator('a[href^="/shop/"]').nth(1)).toBeVisible()
    }
  })

  test('reviews section renders', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    await expect(page.getByRole('heading', { name: /Customer Reviews/i })).toBeVisible()
  })

})
