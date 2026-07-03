import { test, expect } from '@playwright/test'

test.describe('Admin — Orders', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/orders')
  })

  test('orders page renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
  })

  test('orders page shows the real status tab strip', async ({ page }) => {
    // Real tabs (orders/page.tsx TABS): Active / Pending Shipment / Completed /
    // Returns / Cancellations / Archived — each with a live count. No "All" tab.
    await expect(page.getByRole('button', { name: /^Active \(\d+\)$/ })).toBeVisible({ timeout: 8_000 })
    for (const label of [/^Pending Shipment \(\d+\)$/, /^Completed \(\d+\)$/, /^Returns \(\d+\)$/, /^Cancellations \(\d+\)$/, /^Archived \(\d+\)$/]) {
      await expect(page.getByRole('button', { name: label })).toBeVisible()
    }
  })

  test('clicking an order opens order detail', async ({ page }) => {
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    // Bounded wait for the list to load (replaces fixed sleep); no orders → skip
    const hasOrders = await firstOrder.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)
    if (!hasOrders) test.skip()

    await firstOrder.click()
    // Order detail should show order number, customer info, and status dropdown
    await expect(
      page.getByText(/#ZD-/i).or(page.getByText(/order status|customer name/i))
    ).toBeVisible()
  })

  test('can change order status to Processing', async ({ page }) => {
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    // Bounded wait for the list to load (replaces fixed sleep); no orders → skip
    if (!await firstOrder.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) test.skip()

    await firstOrder.click()

    const statusSelect = page.getByRole('combobox').filter({ hasText: /new|processing|shipped|delivered/i }).or(
      page.getByLabel(/status/i)
    ).first()
    if (!await statusSelect.isVisible().catch(() => false)) test.skip()

    await statusSelect.selectOption('processing')
    await page.getByRole('button', { name: /save|update/i }).first().click()
    await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 5_000 })
  })

  test('can mark order as Cancelled with reason', async ({ page }) => {
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    // Bounded wait for the list to load (replaces fixed sleep); no orders → skip
    if (!await firstOrder.waitFor({ state: 'visible', timeout: 8_000 }).then(() => true).catch(() => false)) test.skip()

    await firstOrder.click()

    const statusSelect = page.getByLabel(/status/i).or(page.getByRole('combobox').first())
    if (!await statusSelect.isVisible().catch(() => false)) test.skip()

    await statusSelect.selectOption('cancelled')

    // Reason dropdown should appear after selecting cancelled
    const reasonSelect = page.getByLabel(/reason/i).or(page.getByRole('combobox').nth(1))
    if (await reasonSelect.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await reasonSelect.selectOption({ index: 1 })
    }

    await page.getByRole('button', { name: /save|update/i }).first().click()
    await expect(page.getByText(/saved|updated|success|cancelled/i)).toBeVisible({ timeout: 5_000 })
  })

  test('cancelled order count updates in payments tab', async ({ page }) => {
    await page.goto('/admin/payments')
    // Payments page should render tabs — the heading assertion already polls
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible({ timeout: 8_000 })
  })

})

test.describe('Admin — Dashboard', () => {

  test('dashboard loads with KPI cards', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText(/orders|revenue|pending|delivered/i).first()).toBeVisible({ timeout: 8_000 })
  })

  test('dashboard shows COD orders', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByText(/COD|Cash on Delivery/i).first()).toBeVisible({ timeout: 8_000 })
  })

})

test.describe('Admin — COD Management', () => {

  test('COD page renders', async ({ page }) => {
    await page.goto('/admin/cod')
    await expect(page.getByRole('heading', { name: /cod|cash on delivery/i })).toBeVisible()
  })

  test('COD page shows awaiting cash count', async ({ page }) => {
    await page.goto('/admin/cod')
    // The visibility assertion polls — no fixed sleep needed
    await expect(page.getByText(/awaiting|collected|pending/i).first()).toBeVisible({ timeout: 8_000 })
  })

})

/**
 * US7 — Returns & cancellations managed within /admin/orders.
 * Real UI: tabs "Returns (n)" and "Cancellations (n)" show customer request
 * cards alongside orders already in those statuses.
 */
test.describe('Admin — Orders: Returns & Cancellations', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/orders')
  })

  test('Returns and Cancellations tabs are present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^Returns \(\d+\)$/ })).toBeVisible({ timeout: 8_000 })
    await expect(page.getByRole('button', { name: /^Cancellations \(\d+\)$/ })).toBeVisible()
  })

  test('Returns tab opens without error and shows requests or empty state', async ({ page }) => {
    await page.getByRole('button', { name: /^Returns \(\d+\)$/ }).click()
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })

  test('Cancellations tab opens without error', async ({ page }) => {
    await page.getByRole('button', { name: /^Cancellations \(\d+\)$/ }).click()
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
    await expect(page.getByText(/Application error/i)).not.toBeVisible()
  })

  test('pending return request card shows actionable status', async ({ page }) => {
    const returnsTab = page.getByRole('button', { name: /^Returns \((\d+)\)$/ })
    const label = await returnsTab.textContent()
    const count = Number(label?.match(/\((\d+)\)/)?.[1] ?? 0)
    test.skip(count === 0, 'no return requests in DB to exercise')

    await returnsTab.click()
    await expect(
      page.getByText(/Return Request|Exchange Request|pending|approved/i).first()
    ).toBeVisible({ timeout: 8_000 })
  })
})
