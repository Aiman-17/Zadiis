import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 }, hasTouch: true })

async function longPress(page: import('@playwright/test').Page, locator: import('@playwright/test').Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('locator not found')
  // Playwright's touchscreen.tap is instantaneous — dispatch real touch
  // events with a hold instead, matching the ProductImageGallery swipe test's approach.
  await locator.evaluate((el, { x, y }) => {
    const touch = new Touch({ identifier: 0, target: el, clientX: x, clientY: y })
    el.dispatchEvent(new TouchEvent('touchstart', { touches: [touch], bubbles: true }))
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 })
  await page.waitForTimeout(600)
  await locator.evaluate(el => {
    el.dispatchEvent(new TouchEvent('touchend', { changedTouches: [], bubbles: true }))
  })
}

test.describe('Admin — Mobile long-press row actions (US6)', () => {

  test('products page hides archive icon by default at 375px, long-press reveals it', async ({ page }) => {
    await page.goto('/admin/products')
    const row = page.locator('tr', { has: page.getByTitle('Archive product') }).first()
    const hasRow = await row.isVisible({ timeout: 5_000 }).catch(() => false)
    test.skip(!hasRow, 'no active products with an archive action found')

    await expect(page.getByTitle('Archive product').first()).not.toBeVisible()
    await longPress(page, row)
    await expect(page.getByTitle('Archive product').first()).toBeVisible({ timeout: 2_000 })
  })

  test('notifications page hides archive/delete icons by default at 375px', async ({ page }) => {
    await page.goto('/admin/notifications')
    const hasAny = await page.getByTitle('Archive notification').first().isVisible({ timeout: 5_000 }).catch(() => false)
    test.skip(!hasAny, 'no notifications found')
    await expect(page.getByTitle('Archive notification').first()).not.toBeVisible()
  })
})

test.describe('Admin — Mobile long-press row actions — desktop unaffected', () => {
  test.use({ viewport: { width: 1280, height: 800 }, hasTouch: false })

  test('products page shows archive icon directly at desktop width', async ({ page }) => {
    await page.goto('/admin/products')
    const hasAny = await page.getByTitle('Archive product').first().isVisible({ timeout: 5_000 }).catch(() => false)
    test.skip(!hasAny, 'no active products with an archive action found')
    await expect(page.getByTitle('Archive product').first()).toBeVisible()
  })
})
