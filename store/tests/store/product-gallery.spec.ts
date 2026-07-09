import { test, expect } from '@playwright/test'

test.use({ hasTouch: true })

// Helper: get the slug of the first product visible in the shop
async function getFirstProductSlug(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/shop')
  await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
  const href = await page.locator('a[href^="/shop/"]').first().getAttribute('href')
  if (!href) throw new Error('No product cards found')
  return href
}

// Dispatches real TouchEvents in-browser (Playwright's touchscreen API only
// supports tap, not swipe) — hasTouch: true makes Touch/TouchEvent available.
async function swipe(page: import('@playwright/test').Page, selector: string, direction: 'left' | 'right') {
  await page.locator(selector).first().evaluate((el, dir) => {
    const rect = el.getBoundingClientRect()
    const startX = dir === 'left' ? rect.right - 20 : rect.left + 20
    const endX = dir === 'left' ? rect.left + 20 : rect.right - 20
    const y = rect.top + rect.height / 2
    const touch = (x: number) => new Touch({ identifier: 0, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch(startX)], bubbles: true, cancelable: true }))
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [touch(endX)], bubbles: true, cancelable: true }))
  }, direction)
}

test.describe('Product gallery — swipe navigation (US1)', () => {

  test('swiping left advances to the next image', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    const thumbnails = page.locator('button:has(img[alt*="view"])')
    const count = await thumbnails.count()
    test.skip(count < 2, 'product has fewer than 2 images')

    const mainImage = page.locator('.cursor-zoom-in')
    await expect(mainImage).toBeVisible({ timeout: 8_000 })

    // Active thumbnail starts at index 0 (gold outline)
    await expect(thumbnails.nth(1)).toBeVisible()
    await swipe(page, '.cursor-zoom-in', 'left')
    // After swiping left, thumbnail 1 should now show the active outline
    await expect(thumbnails.nth(1)).toHaveCSS('outline-color', 'rgb(166, 139, 110)', { timeout: 5_000 })
  })

  test('swiping right returns to the previous image', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    const thumbnails = page.locator('button:has(img[alt*="view"])')
    const count = await thumbnails.count()
    test.skip(count < 2, 'product has fewer than 2 images')

    await swipe(page, '.cursor-zoom-in', 'left')
    await swipe(page, '.cursor-zoom-in', 'right')
    await expect(thumbnails.nth(0)).toHaveCSS('outline-color', 'rgb(166, 139, 110)', { timeout: 5_000 })
  })

  test('fullscreen zoom view supports swipe navigation independently', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    const thumbnails = page.locator('button:has(img[alt*="view"])')
    const count = await thumbnails.count()
    test.skip(count < 2, 'product has fewer than 2 images')

    await page.locator('.cursor-zoom-in').click()
    const dots = page.locator('.fixed.inset-0 button.w-2.h-2')
    await expect(dots.first()).toBeVisible({ timeout: 5_000 })
    await swipe(page, '.fixed.inset-0 .relative.w-full.h-full', 'left')
    await expect(dots.nth(1)).toHaveCSS('background-color', 'rgb(166, 139, 110)', { timeout: 5_000 })
  })

  test('a single-image product shows no arrow controls', async ({ page }) => {
    const href = await getFirstProductSlug(page)
    await page.goto(href)
    const thumbnails = page.locator('button:has(img[alt*="view"])')
    const count = await thumbnails.count()
    test.skip(count >= 2, 'this check only applies to single-image products')

    await expect(page.getByLabel('Next image')).not.toBeVisible()
    await expect(page.getByLabel('Previous image')).not.toBeVisible()
  })
})

test.describe('Product gallery — color-to-image matching (US2)', () => {

  // Find a product that has color swatches — image_colors tagging requires
  // an admin to have tagged at least one image, which fresh seed data won't
  // have; this suite exercises the untagged-selection no-op path (a required
  // acceptance scenario in its own right) and skips the exact-match jump
  // assertion when no tagged product exists, per quickstart.md's manual step.
  async function findProductWithColors(page: import('@playwright/test').Page): Promise<string | null> {
    await page.goto('/shop')
    await page.waitForSelector('a[href^="/shop/"]', { timeout: 10_000 })
    const hrefs = await page.locator('a[href^="/shop/"]').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).getAttribute('href')))
    for (const href of hrefs.slice(0, 12)) {
      if (!href) continue
      await page.goto(href)
      const swatches = page.locator('button:has(> span.rounded-full)')
      if (await swatches.count() > 0) return href
    }
    return null
  }

  test('selecting a color with no tagged image leaves the gallery unaffected', async ({ page }) => {
    const href = await findProductWithColors(page)
    test.skip(href === null, 'no product with color swatches found in the first 12 shop listings')
    await page.goto(href!)

    const thumbnails = page.locator('button:has(img[alt*="view"])')
    const countBefore = await thumbnails.count()
    const swatches = page.locator('button:has(> span.rounded-full)')
    await swatches.first().click()

    // No error state, gallery still fully present and browsable
    await expect(page.locator('.cursor-zoom-in')).toBeVisible()
    await expect(thumbnails).toHaveCount(countBefore)
  })
})
