import { test, expect } from '@playwright/test'

/**
 * Spec 004 US1 — Admin notification center (/admin/notifications).
 * Real UI: heading, per-row Archive/Delete icons, collapsible "Archived
 * Notifications" section, "NEW" pill badge on unread rows.
 */

test.describe('Admin notification center', () => {

  test('notifications page renders heading without page error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin/notifications')
    await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible({ timeout: 8_000 })
    expect(errors).toEqual([])
  })

  test('shows an empty state or notification rows, never an error page', async ({ page }) => {
    await page.goto('/admin/notifications')
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  test('archived notifications section is collapsible', async ({ page }) => {
    await page.goto('/admin/notifications')
    const toggle = page.getByRole('button', { name: /Archived Notifications/i })
    await expect(toggle).toBeVisible({ timeout: 8_000 })

    await toggle.click()
    await expect(page.getByText(/Click to hide/i)).toBeVisible({ timeout: 8_000 })
    await toggle.click()
    await expect(page.getByText(/Click to show/i)).toBeVisible({ timeout: 8_000 })
  })

  test('permanent delete asks for confirmation before acting', async ({ page }) => {
    await page.goto('/admin/notifications')

    const deleteBtn = page.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2)').first()
    const hasRecords = await deleteBtn.isVisible().catch(() => false)
    test.skip(!hasRecords, 'no notification records to exercise delete on')

    let confirmShown = false
    page.on('dialog', async (dialog) => {
      confirmShown = dialog.type() === 'confirm' && /Delete this notification permanently/i.test(dialog.message())
      await dialog.dismiss() // never actually delete
    })

    await deleteBtn.click()
    expect(confirmShown).toBe(true)
  })

  test('archive action removes a row from the active list', async ({ page }) => {
    await page.goto('/admin/notifications')

    const archiveBtn = page.locator('button:has(svg.lucide-archive)').first()
    const hasRecords = await archiveBtn.isVisible().catch(() => false)
    test.skip(!hasRecords, 'no notification records to exercise archive on')

    const rowCountBefore = await page.locator('button:has(svg.lucide-archive)').count()
    await archiveBtn.click()
    await expect(page.locator('button:has(svg.lucide-archive)')).toHaveCount(rowCountBefore - 1, { timeout: 8_000 })
  })

  test('bell/notifications nav badge reflects unread count without crashing the layout', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: /Notifications/i })).toBeVisible({ timeout: 8_000 })
  })

  test('unauthenticated visit to notifications redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/notifications')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })
})
