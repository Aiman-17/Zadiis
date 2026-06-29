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
    // At least one product row should exist after setup
    await page.waitForTimeout(2_000)
    const rows = page.locator('table tr, [role="row"]').filter({ hasNot: page.locator('th') })
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('create new product — form renders required fields', async ({ page }) => {
    await page.getByRole('link', { name: /Add|New Product/i }).or(
      page.getByRole('button', { name: /Add|New Product/i })
    ).first().click()

    await expect(page).toHaveURL('/admin/products/new')
    await expect(page.getByLabel(/Product Name/i).or(page.getByPlaceholder(/name/i))).toBeVisible()
    await expect(page.getByLabel(/Price/i).or(page.getByPlaceholder(/price/i))).toBeVisible()
    await expect(page.getByLabel(/Description/i).or(page.getByPlaceholder(/description/i))).toBeVisible()
  })

  test('new product form — is_new_arrival settings panel renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByText(/New Arrival Settings|Launch Date|Expiry Date/i).first()).toBeVisible()
  })

  test('new product form — is_trending toggle renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByLabel(/trending/i).or(page.getByText(/Is Trending/i))).toBeVisible()
  })

  test('new product form — no_restock toggle renders', async ({ page }) => {
    await page.goto('/admin/products/new')
    await expect(page.getByLabel(/no.?restock|restock/i).or(page.getByText(/No Restock/i))).toBeVisible()
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
    // Click Edit on first product
    const editLink = page.getByRole('link', { name: /Edit/i }).first()
    const hasEdit = await editLink.isVisible().catch(() => false)
    if (!hasEdit) test.skip()

    await editLink.click()
    await expect(page.url()).toContain('/edit')

    // Name field should be pre-populated
    const nameInput = page.getByLabel(/Product Name/i).or(page.getByPlaceholder(/product name/i))
    const value = await nameInput.inputValue()
    expect(value.length).toBeGreaterThan(0)
  })

  test('edit product — is_trending toggle saves', async ({ page }) => {
    const editLink = page.getByRole('link', { name: /Edit/i }).first()
    const hasEdit = await editLink.isVisible().catch(() => false)
    if (!hasEdit) test.skip()

    await editLink.click()

    const trendingToggle = page.getByLabel(/trending/i).or(page.getByRole('checkbox', { name: /trending/i }))
    const initialState = await trendingToggle.isChecked().catch(() => false)

    await trendingToggle.click()
    await page.waitForTimeout(200)
    const newState = await trendingToggle.isChecked()
    expect(newState).toBe(!initialState)

    // Save
    await page.getByRole('button', { name: /Save|Update/i }).first().click()
    await expect(page.getByText(/saved|updated|success/i)).toBeVisible({ timeout: 8_000 })
  })

})
