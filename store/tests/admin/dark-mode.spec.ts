import { test, expect } from '@playwright/test'

test.describe('Admin — Dark mode (US11)', () => {

  test('toggling dark mode applies it across the panel and persists on reload', async ({ page }) => {
    await page.goto('/admin')
    const toggle = page.getByRole('button', { name: /dark mode|light mode/i })
    await expect(toggle).toBeVisible({ timeout: 8_000 })

    // Starts light (default) — confirm root wrapper has no dark class
    const rootBefore = page.locator('div.flex.min-h-screen').first()
    await expect(rootBefore).not.toHaveClass(/\bdark\b/)

    await toggle.click()
    await expect(rootBefore).toHaveClass(/\bdark\b/)

    // Persisted across a reload
    await page.reload()
    const rootAfter = page.locator('div.flex.min-h-screen').first()
    await expect(rootAfter).toHaveClass(/\bdark\b/)

    // Navigate to Analytics — dark class still applied, charts still render
    await page.goto('/admin/analytics')
    await expect(page.locator('div.flex.min-h-screen').first()).toHaveClass(/\bdark\b/)
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    // Toggle back off — full revert
    await page.goto('/admin')
    const offToggle = page.getByRole('button', { name: /light mode/i })
    await offToggle.click()
    await expect(page.locator('div.flex.min-h-screen').first()).not.toHaveClass(/\bdark\b/)
  })
})
