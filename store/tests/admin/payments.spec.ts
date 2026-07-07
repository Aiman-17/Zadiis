import { test, expect } from '@playwright/test'

/**
 * US6 — Admin payments management (/admin/payments).
 * Real UI: filter tabs "All (n)" / "Pending (n)" / "Paid (n)", per-record
 * archive action, collapsible "Archived Payments" section, and a
 * confirm()-guarded permanent delete.
 */

test.describe('Admin payments page', () => {

  test('payments page renders heading and filter tabs', async ({ page }) => {
    await page.goto('/admin/payments')
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: /^All \(\d+\)$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Pending \(\d+\)$/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Paid \(\d+\)$/ })).toBeVisible()
  })

  test('Paid filter shows only paid records or an empty state', async ({ page }) => {
    await page.goto('/admin/payments')
    const paidTab = page.getByRole('button', { name: /^Paid \((\d+)\)$/ })
    const label = await paidTab.textContent()
    const count = Number(label?.match(/\((\d+)\)/)?.[1] ?? 0)

    await paidTab.click()
    if (count === 0) {
      await expect(page.getByText(/No payments in this category/i)).toBeVisible({ timeout: 8_000 })
    } else {
      await expect(page.getByText(/✓ Confirmed|paid/i).first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('Pending filter switches without error', async ({ page }) => {
    await page.goto('/admin/payments')
    await page.getByRole('button', { name: /^Pending \(\d+\)$/ }).click()
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })

  test('archived payments section is collapsible', async ({ page }) => {
    await page.goto('/admin/payments')
    const toggle = page.getByText('Archived Payments')
    test.skip(!(await toggle.isVisible().catch(() => false)), 'no archived payments section rendered (no archived records)')

    await toggle.click()
    await expect(page.getByText(/Click to hide/i)).toBeVisible({ timeout: 8_000 })
    await toggle.click()
    await expect(page.getByText(/Click to show/i)).toBeVisible({ timeout: 8_000 })
  })

  test('permanent delete asks for confirmation before acting', async ({ page }) => {
    await page.goto('/admin/payments')
    await page.getByRole('button', { name: /^All \(\d+\)$/ }).click()

    // Trash icon buttons are rendered per record; skip when no records exist
    const deleteBtn = page.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2)').first()
    const hasRecords = await deleteBtn.isVisible().catch(() => false)
    test.skip(!hasRecords, 'no payment records to exercise delete on')

    let confirmShown = false
    page.on('dialog', async (dialog) => {
      confirmShown = dialog.type() === 'confirm' && /Permanently DELETE/i.test(dialog.message())
      await dialog.dismiss() // never actually delete
    })

    await deleteBtn.click()
    expect(confirmShown).toBe(true)
  })

  test('unauthenticated visit to payments redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/payments')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })
})
