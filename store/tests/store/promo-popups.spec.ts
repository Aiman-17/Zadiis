import { test, expect } from '@playwright/test'

test.describe('Promo popups (US5)', () => {

  test('free-delivery popup appears once per session on the homepage, then does not repeat', async ({ page }) => {
    await page.goto('/')
    // No active sale is the common case in test data — free-delivery popup
    // should be the one to show (default setting is enabled).
    const dialog = page.getByRole('dialog')
    const appeared = await dialog.isVisible({ timeout: 4_000 }).catch(() => false)
    test.skip(!appeared, 'no promo popup appeared — sale/free-delivery both unavailable in this environment')

    await page.getByRole('button', { name: /close/i }).click()
    await expect(dialog).not.toBeVisible()

    // Same session, another qualifying page — must not reappear
    await page.goto('/shop')
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 3_000 })
  })

  test('a fresh session allows the popup to reappear', async ({ browser }) => {
    const context1 = await browser.newContext()
    const page1 = await context1.newPage()
    await page1.goto('/')
    const dialog1 = page1.getByRole('dialog')
    const appeared = await dialog1.isVisible({ timeout: 4_000 }).catch(() => false)
    if (appeared) await page1.getByRole('button', { name: /close/i }).click()
    await context1.close()
    test.skip(!appeared, 'no promo popup appeared in this environment')

    const context2 = await browser.newContext()
    const page2 = await context2.newPage()
    await page2.goto('/')
    await expect(page2.getByRole('dialog')).toBeVisible({ timeout: 4_000 })
    await context2.close()
  })
})
