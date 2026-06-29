import { test, expect } from '@playwright/test'

test.describe('Home page', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('renders hero section with Shop Now CTA', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Dressed in Confidence/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /Shop Now/i })).toBeVisible()
  })

  test('Shop Now navigates to /shop', async ({ page }) => {
    await page.getByRole('link', { name: /Shop Now/i }).click()
    await expect(page).toHaveURL('/shop')
  })

  test('trust bar renders all 5 items', async ({ page }) => {
    await expect(page.getByText(/Free delivery over PKR/i)).toBeVisible()
    await expect(page.getByText(/Easy 7-day returns/i)).toBeVisible()
    await expect(page.getByText(/Secure payments/i)).toBeVisible()
    await expect(page.getByText(/100% authentic/i)).toBeVisible()
    await expect(page.getByText(/happy customers/i)).toBeVisible()
  })

  test('product sections render when products exist', async ({ page }) => {
    // At least one section heading should be visible — sections are hidden when empty
    const headings = ['Trending', 'New Arrivals', 'Just Dropped', 'Best Sellers', 'Last Chance']
    let found = 0
    for (const h of headings) {
      const el = page.getByText(h, { exact: true })
      if (await el.isVisible().catch(() => false)) found++
    }
    // The store should have at least some products after initial setup
    expect(found).toBeGreaterThan(0)
  })

  test('sale banner is visible when a sale is active', async ({ page }) => {
    const banner = page.getByText(/Limited Time Sale/i)
    const saleBanner = page.locator('section').filter({ hasText: /Shop the Sale/i })
    // Either the banner is visible (sale active) or it isn't (no active sale) — both are valid
    const hasSale = await saleBanner.isVisible().catch(() => false)
    if (hasSale) {
      await expect(banner).toBeVisible()
      await expect(page.getByRole('link', { name: /Shop the Sale/i })).toBeVisible()
    } else {
      await expect(banner).not.toBeVisible()
    }
  })

  test('navigation header links are present', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Shop/i }).first()).toBeVisible()
  })

  test('footer renders brand name', async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(page.getByRole('contentinfo')).toContainText('ZADIIS')
  })

})
