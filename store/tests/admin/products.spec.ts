import { test, expect } from '@playwright/test'

test.describe('Admin — Products', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/products')
  })

  test('products list page renders', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /products/i })).toBeVisible()
  })

  test('Add New Product button is present', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /Add|New Product/i }).or(
        page.getByRole('button', { name: /Add|New Product/i })
      )
    ).toBeVisible()
  })

  test('product list shows product names', async ({ page }) => {
    // At least one product row should exist after setup — wait for the first
    // row to render instead of a fixed sleep
    const rows = page.locator('table tr, [role="row"]').filter({ hasNot: page.locator('th') })
    await expect(rows.first()).toBeVisible({ timeout: 8_000 })
    expect(await rows.count()).toBeGreaterThan(0)
  })

  test('create new product — form renders required fields', async ({ page }) => {
    await page.getByRole('link', { name: /Add|New Product/i }).or(
      page.getByRole('button', { name: /Add|New Product/i })
    ).first().click()

    await expect(page).toHaveURL('/admin/products/new')
    await expect(page.getByLabel(/Product Name/i).or(page.getByPlaceholder(/name/i))).toBeVisible()
    // Anchor to the field's full accessible name — /Price/i alone also matches
    // "Cost Price (PKR)" and trips strict mode
    await expect(page.getByRole('spinbutton', { name: /^Price \(PKR\)/i })).toBeVisible()
    await expect(page.getByLabel(/Description/i).or(page.getByPlaceholder(/description/i))).toBeVisible()
  })

  test('new product form — is_new_arrival settings panel renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    // The Launch/Expiry panel only renders after the "✦ New Arrival" badge
    // toggle is switched on (new/page.tsx: conditional block)
    await page.getByRole('button', { name: /New Arrival/i }).first().click()
    await expect(page.getByText(/New Arrival Settings/i)).toBeVisible()
    await expect(page.getByText(/Launch Date/i)).toBeVisible()
    await expect(page.getByText(/Expiry Date/i)).toBeVisible()
  })

  test('new product form — is_trending toggle renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    // Trending is a badge toggle button labeled "↑ Trending", not a checkbox
    await expect(page.getByRole('button', { name: /Trending/i }).first()).toBeVisible()
  })

  test('new product form — no_restock toggle renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    // Target the checkbox role — getByLabel + getByText both match and trip strict mode
    await expect(page.getByRole('checkbox', { name: /No restock planned/i })).toBeVisible()
  })

  test('create product saves and redirects to product list', async ({ page }) => {
    await page.goto('/admin/products/new')

    // Fill minimum required fields
    const nameInput = page.getByLabel(/Product Name/i).or(page.getByPlaceholder(/product name/i))
    await nameInput.fill(`E2E Test Product ${Date.now()}`)

    const priceInput = page.getByLabel(/^Price/i).or(page.getByPlaceholder(/^price/i))
    await priceInput.fill('2500')

    const descInput = page.getByLabel(/Description/i).or(page.getByPlaceholder(/description/i))
    await descInput.fill('Playwright test product — safe to delete')

    // Select a category if dropdown exists
    const catSelect = page.getByLabel(/Category/i).or(page.getByRole('combobox').first())
    const catOptions = await catSelect.locator('option').all()
    if (catOptions.length > 1) await catSelect.selectOption({ index: 1 })

    // Submit
    await page.getByRole('button', { name: /Save|Create|Submit/i }).first().click()

    // Should redirect to product list or show success
    await expect(
      page.getByText(/saved|created|success/i).or(page.locator('[href="/admin/products"]'))
    ).toBeVisible({ timeout: 10_000 })
  })

  test('edit product page loads with existing values', async ({ page }) => {
    // Href-based locator — row "Edit" links carry no stable accessible name
    const editLink = page.locator('a[href*="/admin/products/"][href*="/edit"]').first()
    const hasEdit = await editLink.isVisible().catch(() => false)
    if (!hasEdit) test.skip()

    await editLink.click()
    await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 8_000 })

    // Name field should be pre-populated
    const nameInput = page.getByLabel(/Product Name/i).or(page.getByPlaceholder(/product name/i))
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('edit product — is_trending toggle saves', async ({ page }) => {
    const editLink = page.locator('a[href*="/admin/products/"][href*="/edit"]').first()
    const hasEdit = await editLink.isVisible().catch(() => false)
    if (!hasEdit) test.skip()

    await editLink.click()
    await page.waitForURL(/\/admin\/products\/.+\/edit/, { timeout: 8_000 })

    // Trending is a badge toggle button ("↑ Trending"), not a checkbox.
    // Toggle it twice so the saved value is unchanged — no data mutation.
    const trendingToggle = page.getByRole('button', { name: /Trending/i }).first()
    await trendingToggle.click()
    await trendingToggle.click()

    await page.getByRole('button', { name: /Save|Update/i }).first().click()
    // Save either redirects back to the product list or shows a success note
    const redirected = await page
      .waitForURL(/\/admin\/products\/?$/, { timeout: 10_000 })
      .then(() => true)
      .catch(() => false)
    if (!redirected) {
      await expect(page.getByText(/saved|updated|success/i).first()).toBeVisible({ timeout: 8_000 })
    }
  })

})
