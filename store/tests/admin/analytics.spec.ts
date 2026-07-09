import { test, expect } from '@playwright/test'

/**
 * US5 — Admin analytics dashboard (/admin/analytics).
 * Real UI: 5 tabs (Revenue, Sales Performance, Merchandising, Inventory,
 * Orders — renamed from Performance/Products in spec 006 US10, label-only)
 * and a range selector (7 Days, 30 Days, 90 Days, 12 Months).
 */

const TABS = ['Revenue', 'Sales Performance', 'Merchandising', 'Inventory', 'Orders']

test.describe('Admin analytics dashboard', () => {

  test('analytics page renders heading without page error', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin/analytics')
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible({ timeout: 8_000 })
    expect(errors).toEqual([])
  })

  test('all five tabs are present', async ({ page }) => {
    await page.goto('/admin/analytics')
    for (const tab of TABS) {
      await expect(page.getByRole('button', { name: tab, exact: true }).first()).toBeVisible({ timeout: 8_000 })
    }
  })

  test('every tab switches without a client crash', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/admin/analytics')
    for (const tab of TABS) {
      await page.getByRole('button', { name: tab, exact: true }).first().click()
      // Heading stays mounted — the page did not white-screen
      await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('date range selector changes range without crash', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: '7 Days' }).click()
    await expect(page).toHaveURL(/range=7d/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()

    await page.getByRole('button', { name: '12 Months' }).click()
    await expect(page).toHaveURL(/range=12m/, { timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  })

  test('Revenue tab shows revenue figures or empty state — never an error page', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Revenue', exact: true }).first().click()
    // PKR amounts render for data, or the section renders empty — both acceptable;
    // an unhandled error page is not.
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  test('unauthenticated visit to analytics redirects to login', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
    const page = await context.newPage()
    await page.goto('/admin/analytics')
    await expect(page).toHaveURL(/\/admin\/login/, { timeout: 8_000 })
    await context.close()
  })

  // Spec 004 US2 — YoY widgets, additive to Revenue and Performance tabs.
  test('Revenue tab shows the YoY widget in collapsed or expanded state', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Revenue', exact: true }).first().click()
    await expect(page.getByText('Revenue — Year over Year')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  test('Sales Performance tab shows the YoY widget in collapsed or expanded state', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Sales Performance', exact: true }).first().click()
    await expect(page.getByText('Sales — Year over Year')).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  // Spec 006 — US7 (additive visuals), US8 (badge lift), US10 (rename)
  test('Sales Performance tab shows Featured/New Arrival sales and badge lift sections', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Sales Performance', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Featured Product Sales' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('heading', { name: 'New Arrival Sales' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Badge Effectiveness — Before / After' })).toBeVisible()
    await expect(page.getByText(/reflects correlation with the badge date, not a controlled experiment/i)).toBeVisible()
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  test('Inventory tab shows the new row-level product table alongside existing content', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Inventory', exact: true }).first().click()
    await expect(page.getByRole('heading', { name: 'Inventory by Product' })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Application error|Something went wrong/i)).not.toBeVisible()
  })

  test('YoY widget state is unaffected by the range filter (regression: decoupled fetch)', async ({ page }) => {
    await page.goto('/admin/analytics')
    await page.getByRole('button', { name: 'Revenue', exact: true }).first().click()
    const widget = page.getByText('Revenue — Year over Year')
    await expect(widget).toBeVisible({ timeout: 8_000 })
    const textBefore = await page.locator('text=Revenue — Year over Year').locator('..').textContent()

    await page.getByRole('button', { name: '7 Days' }).click()
    await page.getByRole('button', { name: 'Revenue', exact: true }).first().click()
    await expect(widget).toBeVisible({ timeout: 8_000 })
    const textAfter = await page.locator('text=Revenue — Year over Year').locator('..').textContent()

    expect(textAfter).toEqual(textBefore)
  })
})
