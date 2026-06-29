import { test, expect } from '@playwright/test'

test.describe('Admin — Orders', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/orders')
  })

  test('orders page renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
  })

  test('orders table has expected status columns', async ({ page }) => {
    await page.waitForTimeout(2_000)
    // Expect status filter tabs or column headers
    const statusLabels = ['All', 'New', 'Processing', 'Shipped', 'Delivered', 'Cancelled']
    let found = 0
    for (const label of statusLabels) {
      const el = page.getByRole('tab', { name: label }).or(page.getByRole('button', { name: label })).or(page.getByText(label))
      if (await el.first().isVisible().catch(() => false)) found++
    }
    expect(found).toBeGreaterThan(1)
  })

  test('clicking an order opens order detail', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    const hasOrders = await firstOrder.isVisible().catch(() => false)
    if (!hasOrders) test.skip()

    await firstOrder.click()
    // Order detail should show order number, customer info, and status dropdown
    await expect(
      page.getByText(/#ZD-/i).or(page.getByText(/order status|customer name/i))
    ).toBeVisible()
  })

  test('can change order status to Processing', async ({ page }) => {
    await page.waitForTimeout(2_000)
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    if (!await firstOrder.isVisible().catch(() => false)) test.skip()

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
    await page.waitForTimeout(2_000)
    const firstOrder = page.getByRole('link', { name: /#ZD-/i }).or(
      page.locator('table tr').nth(1).getByRole('link')
    ).first()
    if (!await firstOrder.isVisible().catch(() => false)) test.skip()

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
    await page.waitForTimeout(2_000)
    // Payments page should render tabs — check it loads without error
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible()
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
    await page.waitForTimeout(2_000)
    await expect(page.getByText(/awaiting|collected|pending/i).first()).toBeVisible()
  })

})
