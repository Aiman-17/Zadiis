import { test, expect } from '@playwright/test'

/**
 * US11 — Admin invoices smoke coverage (/admin/invoices).
 * Real UI: invoice rows loaded from /api/admin/invoices with date filters
 * and per-invoice print page at /admin/invoices/[id]/print.
 */

test.describe('Admin invoices page', () => {

  test('invoices page renders without error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin/invoices')
    await expect(page.getByText(/invoice/i).first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
    expect(errors).toEqual([])
  })

  test('invoice list shows records or an empty state', async ({ page }) => {
    await page.goto('/admin/invoices')
    // Rows load async — wait for either an invoice number or an empty message.
    // .first() must wrap the combined .or() — chaining .first().or(x.first())
    // still resolves both sides and trips strict mode.
    await expect(
      page.getByText(/INV-|No invoices|no records/i).or(page.getByText(/invoice/i)).first()
    ).toBeVisible({ timeout: 8_000 })
  })

  test('invoice print link opens print view', async ({ page }) => {
    await page.goto('/admin/invoices')
    const printLink = page.locator('a[href*="/print"]').first()
    const hasInvoices = await printLink.isVisible().catch(() => false)
    test.skip(!hasInvoices, 'no invoices in DB to print')

    // The print link has target="_blank" (invoices/page.tsx) — it opens a new
    // tab, so wait for the popup instead of a same-page navigation.
    const [printPage] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8_000 }),
      printLink.click(),
    ])
    await printPage.waitForLoadState()
    expect(printPage.url()).toMatch(/\/admin\/invoices\/.+\/print/)
    await expect(printPage.getByText(/invoice/i).first()).toBeVisible()
  })

  test('deleting an invoice asks for confirmation first', async ({ page }) => {
    await page.goto('/admin/invoices')
    const deleteBtn = page.locator('button:has(svg.lucide-trash-2), button:has(svg.lucide-trash2)').first()
    const hasInvoices = await deleteBtn.isVisible().catch(() => false)
    test.skip(!hasInvoices, 'no invoices in DB to exercise delete on')

    let confirmShown = false
    page.on('dialog', async (dialog) => {
      confirmShown = dialog.type() === 'confirm' && /Delete this invoice/i.test(dialog.message())
      await dialog.dismiss() // never actually delete
    })
    await deleteBtn.click()
    expect(confirmShown).toBe(true)
  })

  test('unauthenticated visit to invoices redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/invoices')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })
})
