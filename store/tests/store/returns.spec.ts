import { test, expect } from '@playwright/test'

/**
 * US4 — Customer self-service returns (/returns) and cancellations (/cancel-order).
 * Submission APIs are mocked at the boundary; the forms under test are real.
 */

test.describe('Returns page', () => {

  test('returns page renders policy and request form', async ({ page }) => {
    await page.goto('/returns')
    await expect(page.getByRole('heading', { name: /Returns & Exchanges/i })).toBeVisible()
    await expect(page.getByText(/3-Day Return Policy/i)).toBeVisible()
    await expect(page.getByPlaceholder('e.g. ZD-1023')).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
  })

  test('submit button is disabled until required fields are filled', async ({ page }) => {
    await page.goto('/returns')
    const submit = page.getByRole('button', { name: /Submit (Return|Exchange) Request/i })
    await expect(submit).toBeDisabled()
  })

  test('valid return request shows received confirmation', async ({ page }) => {
    await page.route('**/api/requests/return', (route) => route.fulfill({ json: { success: true } }))
    await page.goto('/returns')

    await page.getByPlaceholder('e.g. ZD-1023').fill('ZD-1023')
    await page.getByPlaceholder('your@email.com').fill('e2e-test@zadiis.test')
    await page.getByPlaceholder(/full name/i).fill('E2E Test Customer')
    // Pick the first reason radio in the return-reason group
    await page.locator('input[name="return_reason"]').first().check()

    const submit = page.getByRole('button', { name: /Submit (Return|Exchange) Request/i })
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page.getByText(/We have received your (return|exchange) request/i)).toBeVisible({ timeout: 8_000 })
  })

  test('server rejection shows error, not false confirmation', async ({ page }) => {
    await page.route('**/api/requests/return', (route) =>
      route.fulfill({ status: 404, json: { error: 'Order not found. Please check your order number.' } })
    )
    await page.goto('/returns')

    await page.getByPlaceholder('e.g. ZD-1023').fill('ZD-00000')
    await page.getByPlaceholder('your@email.com').fill('e2e-test@zadiis.test')
    await page.getByPlaceholder(/full name/i).fill('E2E Test Customer')
    await page.locator('input[name="return_reason"]').first().check()
    await page.getByRole('button', { name: /Submit (Return|Exchange) Request/i }).click()

    await expect(page.getByText(/Order not found/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/We have received your/i)).not.toBeVisible()
  })
})

test.describe('Cancel order page', () => {

  test('cancel-order page renders form with reasons', async ({ page }) => {
    await page.goto('/cancel-order')
    await expect(page.getByPlaceholder('e.g. ZD-1023')).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByText(/I changed my mind/i)).toBeVisible()
  })

  test('valid cancellation request shows received confirmation', async ({ page }) => {
    await page.route('**/api/requests/cancel', (route) => route.fulfill({ json: { success: true } }))
    await page.goto('/cancel-order')

    await page.getByPlaceholder('e.g. ZD-1023').fill('ZD-1023')
    await page.getByPlaceholder('your@email.com').fill('e2e-test@zadiis.test')
    await page.getByPlaceholder(/full name/i).fill('E2E Test Customer')
    await page.getByText(/I changed my mind/i).click()
    await page.getByRole('button', { name: /submit|cancel/i }).last().click()

    await expect(page.getByText(/We have received your cancellation request/i)).toBeVisible({ timeout: 8_000 })
  })

  test('unknown order number shows server error message', async ({ page }) => {
    await page.route('**/api/requests/cancel', (route) =>
      route.fulfill({ status: 404, json: { error: 'Order not found. Please check your order number.' } })
    )
    await page.goto('/cancel-order')

    await page.getByPlaceholder('e.g. ZD-1023').fill('ZD-00000')
    await page.getByPlaceholder('your@email.com').fill('e2e-test@zadiis.test')
    await page.getByPlaceholder(/full name/i).fill('E2E Test Customer')
    await page.getByText(/I changed my mind/i).click()
    await page.getByRole('button', { name: /submit|cancel/i }).last().click()

    await expect(page.getByText(/Order not found/i)).toBeVisible({ timeout: 8_000 })
  })
})
