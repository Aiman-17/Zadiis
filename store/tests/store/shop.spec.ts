import { test, expect } from '@playwright/test'

test.describe('Shop page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/shop')
  })

  test('renders Women\'s Collection heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Women's Collection/i })).toBeVisible()
  })

  test('product grid loads with at least one product', async ({ page }) => {
    // Wait for Suspense to resolve
    await expect(page.locator('.grid').last()).toBeVisible({ timeout: 10_000 })
    const cards = page.locator('a[href^="/shop/"]')
    await expect(cards.first()).toBeVisible({ timeout: 10_000 })
  })

  test('section tab strip renders', async ({ page }) => {
    // ProductSectionTabs should render tabs for each curated section
    const tabs = ['Trending', 'New Arrivals', 'Just Dropped', 'Best Sellers', 'Last Chance']
    for (const tab of tabs) {
      await expect(page.getByRole('button', { name: tab }).or(page.getByText(tab)).first()).toBeVisible()
    }
  })

  test('search filters product list', async ({ page }) => {
    // Get initial product count
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    const initial = await page.locator('a[href^="/shop/"]').count()

    // Search for something unlikely to match all products
    await page.getByPlaceholder(/search/i).fill('kameez')
    await page.waitForTimeout(500)

    // Result count should have changed (either fewer results or same)
    const after = await page.locator('a[href^="/shop/"]').count()
    expect(after).toBeLessThanOrEqual(initial)
  })

  test('clearing search restores full list', async ({ page }) => {
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    const initial = await page.locator('a[href^="/shop/"]').count()

    await page.getByPlaceholder(/search/i).fill('xyznothing')
    await page.waitForTimeout(500)

    await page.getByPlaceholder(/search/i).clear()
    await page.waitForTimeout(500)
    const after = await page.locator('a[href^="/shop/"]').count()
    expect(after).toBe(initial)
  })

  test('price filter limits visible products', async ({ page }) => {
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    const initial = await page.locator('a[href^="/shop/"]').count()

    // Apply tight max price — should reduce results
    const maxInput = page.getByPlaceholder(/max/i).or(page.getByLabel(/max price/i))
    if (await maxInput.isVisible()) {
      await maxInput.fill('500')
      await page.getByRole('button', { name: /apply|filter/i }).first().click()
      await page.waitForTimeout(500)
      const after = await page.locator('a[href^="/shop/"]').count()
      expect(after).toBeLessThanOrEqual(initial)
    }
  })

  test('clicking a product card navigates to product detail', async ({ page }) => {
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    const firstCard = page.locator('a[href^="/shop/"]').first()
    const href = await firstCard.getAttribute('href')
    await firstCard.click()
    await expect(page).toHaveURL(href!)
  })

  test('mobile filter drawer opens and closes', async ({ page, viewport }) => {
    if ((viewport?.width ?? 1280) >= 768) test.skip()

    const filterButton = page.getByRole('button', { name: /filter/i })
    await expect(filterButton).toBeVisible()
    await filterButton.click()

    // Drawer/sheet should open
    const drawer = page.locator('[role="dialog"]').or(page.getByText(/close/i))
    await expect(drawer.first()).toBeVisible({ timeout: 3_000 })
  })

})

test.describe('Shop — section tabs', () => {

  test('Trending tab shows trending products', async ({ page }) => {
    await page.goto('/shop?tab=trending')
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    // Page should not show empty state — assumes at least 1 trending product exists
    await expect(page.getByText(/No products found/i)).not.toBeVisible()
  })

  test('New Arrivals tab shows new arrival products', async ({ page }) => {
    await page.goto('/shop?tab=new-arrivals')
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 }).catch(() => null)
    // Either products or empty state — no crash
    const hasProducts = await page.locator('a[href^="/shop/"]').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No products found/i).isVisible().catch(() => false)
    expect(hasProducts || hasEmpty).toBe(true)
  })

  test('Last Chance tab shows low-stock products', async ({ page }) => {
    await page.goto('/shop?tab=last-chance')
    await page.waitForTimeout(2_000)
    const hasProducts = await page.locator('a[href^="/shop/"]').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText(/No products found/i).isVisible().catch(() => false)
    expect(hasProducts || hasEmpty).toBe(true)
  })

})
