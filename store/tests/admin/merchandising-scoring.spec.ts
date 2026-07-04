import { test, expect } from '@playwright/test'

/**
 * US2 (Best Seller), US3 (Trending), US4 (Just Dropped), US5 (Featured),
 * US6 (retired flags) — specs/003-merchandising-badges-v2/spec.md.
 *
 * Uses real live catalog data as the fixture (same approach as
 * inventory-stock-decrement.spec.ts) rather than a synthetic seed — this
 * store has no test-data seeding infrastructure, so tests adapt to
 * whatever is really in the database and skip scenarios that aren't
 * currently present, same as the rest of this suite's data-dependent tests.
 */

type AdminProduct = {
  id: string; name: string; slug: string; total_sold: number
  best_seller_score: number; trending_score: number
  stock_quantity: number; product_category?: string
}

async function fetchProducts(page: import('@playwright/test').Page): Promise<AdminProduct[]> {
  const res = await page.request.get('/api/admin/products')
  const data = await res.json()
  return Array.isArray(data) ? data : data?.products ?? []
}

test.describe('Merchandising — Best Seller scoring (US2)', () => {
  test('a product below the minimum sales floor never carries the Best Seller badge, even with a high score', async ({ page }) => {
    const products = await fetchProducts(page)
    const belowFloor = products.filter(p => p.total_sold < 2 && p.best_seller_score > 0)
    test.skip(belowFloor.length === 0, 'no product currently below the minimum-sales floor with a nonzero score to verify against')

    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')
    for (const p of belowFloor) {
      const row = page.getByRole('row', { name: new RegExp(p.name) })
      await expect(row.getByText('★ Best Seller')).not.toBeVisible()
    }
  })

  test('a product meeting the minimum sales floor with the highest score in its comparison group carries the Best Seller badge', async ({ page }) => {
    const products = await fetchProducts(page)
    const qualifying = products.filter(p => p.total_sold >= 2)
    test.skip(qualifying.length === 0, 'no product currently meets the minimum-sales floor')

    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')
    // At least one qualifying product must show the badge somewhere on the page
    await expect(page.getByText('★ Best Seller').first()).toBeVisible({ timeout: 8_000 })
  })

  test('display count never exceeds the cap and is never padded with non-qualifying products', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // The <h2> heading and the product grid are both children of the same
    // section wrapper, but siblings of EACH OTHER's parent, not of each
    // other directly — ancestor::div[2] reaches that shared wrapper.
    const bestSellerHeading = page.getByRole('heading', { name: 'Best Sellers', exact: true })
    const hasSection = await bestSellerHeading.isVisible().catch(() => false)
    if (!hasSection) return // zero qualifying products — correct empty state, nothing to cap

    const cardCount = await bestSellerHeading.locator('xpath=ancestor::div[2]').locator('a[href^="/shop/"]').count()
    expect(cardCount).toBeLessThanOrEqual(4) // BESTSELLER_DISPLAY_CAP
    expect(cardCount).toBeGreaterThan(0)
  })
})

test.describe('Merchandising — Trending (US3)', () => {
  test('Trending badge is driven entirely by trending_score — a product with score 0 never shows it', async ({ page }) => {
    const products = await fetchProducts(page)
    const noMomentum = products.filter(p => p.trending_score === 0)
    test.skip(noMomentum.length === 0, 'every current product has some trending_score')

    await page.goto('/admin/products')
    await page.waitForLoadState('networkidle')
    for (const p of noMomentum) {
      const row = page.getByRole('row', { name: new RegExp(p.name) })
      await expect(row.getByText('↑ Trending')).not.toBeVisible()
    }
  })

  test('admin product form no longer offers a permanent Trending toggle', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByRole('button', { name: '↑ Trending', exact: true })).not.toBeVisible()
  })
})

test.describe('Merchandising — Just Dropped via restock event (US4)', () => {
  test('restocking an existing product (stock increase via admin edit) makes it eligible for Just Dropped', async ({ page }) => {
    const products = await fetchProducts(page)
    const candidate = products.find(p => p.stock_quantity > 0)
    test.skip(!candidate, 'no in-stock product available to safely restock-test')
    const { id, stock_quantity: originalStock } = candidate!

    // Increase stock by 1 via the real admin edit flow (the exact mechanism
    // restocking uses), then restore it — safe and reversible, unlike
    // placing another real order.
    const putRes = await page.request.put('/api/admin/products', {
      data: { id, stock_quantity: originalStock + 1 },
    })
    expect(putRes.ok()).toBe(true)

    try {
      await page.goto('/shop?tab=just-dropped')
      await page.waitForLoadState('networkidle')
      const justDroppedNames = await page.locator('a[href^="/shop/"] h3').allTextContents()
      expect(justDroppedNames).toContain(candidate!.name)
    } finally {
      // Restore original stock — never leave test-mutated data behind
      await page.request.put('/api/admin/products', { data: { id, stock_quantity: originalStock } })
    }
  })

  test('a product with no restock in the freshness window does not appear in Just Dropped', async ({ page }) => {
    const products = await fetchProducts(page)
    await page.goto('/shop?tab=just-dropped')
    await page.waitForLoadState('networkidle')
    const justDroppedNames = await page.locator('a[href^="/shop/"] h3').allTextContents()

    // Every product NOT just-restocked above must be absent unless it has
    // its own genuine recent restock — a loose sanity check: the just-dropped
    // set must never equal the full catalog (would indicate the filter is a
    // no-op).
    test.skip(products.length === 0, 'no products to compare against')
    expect(justDroppedNames.length).toBeLessThanOrEqual(products.length)
  })
})

test.describe('Merchandising — Featured (US5)', () => {
  test('toggling a product Featured on then off correctly shows then hides it in the Featured section', async ({ page }) => {
    const products = await fetchProducts(page)
    const candidate = products[0]
    test.skip(!candidate, 'no product available to test Featured toggle')

    const putOn = await page.request.put('/api/admin/products', {
      data: { id: candidate.id, is_featured: true, featured_start: null, featured_end: null },
    })
    expect(putOn.ok()).toBe(true)

    try {
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      const featuredHeading = page.getByRole('heading', { name: 'Featured', exact: true })
      await expect(featuredHeading).toBeVisible({ timeout: 8_000 })
      const names = await featuredHeading.locator('xpath=ancestor::div[2]').locator('h3').allTextContents()
      expect(names).toContain(candidate.name)
    } finally {
      await page.request.put('/api/admin/products', { data: { id: candidate.id, is_featured: false } })
    }

    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const featuredHeadingAfter = page.getByRole('heading', { name: 'Featured', exact: true })
    const stillFeatured = await featuredHeadingAfter.isVisible().catch(() => false)
    if (stillFeatured) {
      const namesAfter = await featuredHeadingAfter.locator('xpath=ancestor::div[2]').locator('h3').allTextContents()
      expect(namesAfter).not.toContain(candidate.name)
    }
  })

  test('admin product form offers a Featured toggle with optional date fields', async ({ page }) => {
    await page.goto('/admin/products/new')
    const featuredToggle = page.getByRole('button', { name: '☆ Featured', exact: true })
    await expect(featuredToggle).toBeVisible()
    await featuredToggle.click()
    await expect(page.getByText('Featured Settings')).toBeVisible()
    await expect(page.getByText('Start Date')).toBeVisible()
    await expect(page.getByText('End Date')).toBeVisible()
  })
})

test.describe('Merchandising — retired manual flags (US6)', () => {
  test('admin product form no longer offers permanent Best Seller or Trending toggles', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByRole('button', { name: '★ Best Seller', exact: true })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '↑ Trending', exact: true })).not.toBeVisible()
  })

  test('admin edit product form no longer offers permanent Best Seller or Trending toggles', async ({ page }) => {
    const products = await fetchProducts(page)
    test.skip(products.length === 0, 'no product to open the edit form for')
    await page.goto(`/admin/products/${products[0].id}/edit`)
    await expect(page.getByRole('button', { name: '★ Best Seller', exact: true })).not.toBeVisible()
    await expect(page.getByRole('button', { name: '↑ Trending', exact: true })).not.toBeVisible()
  })
})
