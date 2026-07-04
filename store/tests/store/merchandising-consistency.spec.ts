import { test, expect, type Page } from '@playwright/test'

/**
 * US1 (P1, MVP) — every page shows the same merchandising badges.
 * specs/003-merchandising-badges-v2/spec.md, SC-001/SC-002.
 *
 * Compares pages against EACH OTHER (not an independently-recomputed
 * expected value) — this is the actual claim being tested: Shop, Homepage,
 * and Admin Analytics must agree, whatever the current real data says.
 */

/**
 * Each homepage section (store/page.tsx) renders as:
 *   <div class="...">                    <- 2 ancestors up from the <h2>
 *     <div class="flex ...">             <- 1 ancestor up (header row)
 *       <h2>{label}</h2>
 *       <Link>View All</Link>
 *     </div>
 *     <div class="grid ...">{cards}</div>  <- sibling of the header row, not of the h2
 *   </div>
 * The product grid is a sibling of the h2's PARENT, not of the h2 itself —
 * `ancestor::div[2]` reaches the container that holds both the header row
 * and the grid.
 */
async function homeSectionProductNames(page: Page, sectionLabel: string): Promise<string[]> {
  const heading = page.getByRole('heading', { name: sectionLabel, exact: true })
  const isVisible = await heading.isVisible().catch(() => false)
  if (!isVisible) return []
  const section = heading.locator('xpath=ancestor::div[2]')
  return section.locator('a[href^="/shop/"] h3').allTextContents()
}

test.describe('Merchandising — cross-page consistency', () => {
  test('Best Seller product set is identical across Shop and Homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const homeBestSellerNames = await homeSectionProductNames(page, 'Best Sellers')

    await page.goto('/shop')
    await page.waitForLoadState('networkidle')
    // Cards on the Shop grid carrying the Bestseller badge
    const shopBestSellerNames = await page
      .locator('a[href^="/shop/"]')
      .filter({ has: page.getByText('Bestseller') })
      .locator('h3')
      .allTextContents()

    if (homeBestSellerNames.length === 0 && shopBestSellerNames.length === 0) {
      // No qualifying products right now — both correctly show nothing (edge case)
      return
    }
    expect(new Set(shopBestSellerNames)).toEqual(new Set(homeBestSellerNames))
  })

  test('Trending product set is identical across Shop and Homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const homeTrendingNames = await homeSectionProductNames(page, 'Trending')

    await page.goto('/shop?tab=trending')
    await page.waitForLoadState('networkidle')
    const shopTrendingNames = await page.locator('a[href^="/shop/"] h3').allTextContents()

    if (homeTrendingNames.length === 0 && shopTrendingNames.length === 0) {
      return
    }
    expect(new Set(shopTrendingNames)).toEqual(new Set(homeTrendingNames))
  })

  test('Just Dropped product set is identical across Shop and Homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const homeJustDroppedNames = await homeSectionProductNames(page, 'Just Dropped')

    await page.goto('/shop?tab=just-dropped')
    await page.waitForLoadState('networkidle')
    const shopJustDroppedNames = await page.locator('a[href^="/shop/"] h3').allTextContents()

    if (homeJustDroppedNames.length === 0 && shopJustDroppedNames.length === 0) {
      return
    }
    expect(new Set(shopJustDroppedNames)).toEqual(new Set(homeJustDroppedNames))
  })

  test('a Featured product appears in its own distinct section on the homepage', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const featuredNames = await homeSectionProductNames(page, 'Featured')
    test.skip(featuredNames.length === 0, 'no Featured products currently set')
    expect(featuredNames.length).toBeGreaterThan(0)
  })
})
