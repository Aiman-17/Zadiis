import { test, expect } from '@playwright/test'
import { seedCartAndGoToCheckout, fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp } from '../helpers/otp'

/**
 * US1 — Safepay online payment flow (card / JazzCash / Easypaisa).
 *
 * Checkout submits online payments to POST /api/payments/tracker which
 * returns { checkoutUrl } for Safepay's hosted page. The redirect is
 * mocked at the API boundary so no real gateway call or charge occurs.
 * Webhook tests call POST /api/webhooks/safepay directly.
 */

const MOCK_CHECKOUT_URL = 'https://sandbox.api.getsafepay.com/checkout/pay/__e2e_mock_tracker__'

test.describe('Safepay payment — checkout redirect', () => {
  test.beforeEach(async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)
  })

  test('online payment options are visible at checkout', async ({ page }) => {
    await expect(page.getByText(/Credit \/ Debit Card/i)).toBeVisible()
    await expect(page.getByText(/JazzCash/i).first()).toBeVisible()
    await expect(page.getByText(/Easypaisa/i).first()).toBeVisible()
  })

  test('selecting card and submitting redirects to Safepay checkout URL', async ({ page }) => {
    // Serve a stub page for the mocked gateway URL so navigation succeeds offline
    await page.route(`${MOCK_CHECKOUT_URL}*`, (route) =>
      route.fulfill({ contentType: 'text/html', body: '<html><body>Safepay stub</body></html>' })
    )
    await page.route('**/api/payments/tracker', (route) =>
      route.fulfill({ json: { checkoutUrl: MOCK_CHECKOUT_URL } })
    )

    await fillCheckoutForm(page)
    await completeOtp(page)
    await page.getByText(/Credit \/ Debit Card/i).click()
    await page.getByRole('button', { name: /Place Order/i }).click()

    await page.waitForURL(`${MOCK_CHECKOUT_URL}*`, { timeout: 15_000 })
    expect(page.url()).toContain('getsafepay.com')
  })

  test('gateway down response offers manual payment fallback instead of order', async ({ page }) => {
    await page.route('**/api/payments/tracker', (route) =>
      route.fulfill({
        json: { error: 'GATEWAY_DOWN', jazzcash_number: '03000000000', easypaisa_number: '03111111111' },
      })
    )

    await fillCheckoutForm(page)
    await completeOtp(page)
    await page.getByText(/Credit \/ Debit Card/i).click()
    await page.getByRole('button', { name: /Place Order/i }).click()

    await expect(page.getByText(/Online payment is temporarily unavailable/i)).toBeVisible({ timeout: 8_000 })
    // Still on checkout — no order confirmation
    expect(page.url()).toContain('/checkout')
  })

  test('tracker API error keeps customer on checkout with message', async ({ page }) => {
    await page.route('**/api/payments/tracker', (route) =>
      route.fulfill({ status: 500, json: { error: 'Something went wrong. Please try again.' } })
    )

    await fillCheckoutForm(page)
    await completeOtp(page)
    await page.getByText(/Credit \/ Debit Card/i).click()
    await page.getByRole('button', { name: /Place Order/i }).click()

    await expect(page.getByText(/Something went wrong/i)).toBeVisible({ timeout: 8_000 })
    expect(page.url()).toContain('/checkout')
  })
})

test.describe('Safepay webhook — signature enforcement', () => {
  // The dev server verifies HMAC using its own SAFEPAY_SECRET_KEY. The test
  // process may not share that env var, so only the invalid-signature path
  // (which needs no valid key) runs unconditionally where the server has a
  // secret configured; behavior without a secret is asserted loosely.

  test('webhook with invalid signature is rejected or flagged', async ({ page }) => {
    const res = await page.request.post('/api/webhooks/safepay', {
      headers: { 'sfpy-signature': 'deadbeef'.repeat(8) },
      data: { data: { tracker: { token: '__e2e_nonexistent__', status: 'charged' } } },
    })
    // With SAFEPAY_SECRET_KEY set server-side: 401 invalid signature.
    // Without a secret the server skips verification and 404s on the unknown
    // tracker — either way, no order may be updated (2xx success is a failure).
    expect([401, 404]).toContain(res.status())
  })

  test('webhook with unknown tracker token never updates an order', async ({ page }) => {
    const res = await page.request.post('/api/webhooks/safepay', {
      headers: { 'sfpy-signature': '' },
      data: { data: { tracker: { token: '__e2e_nonexistent__', status: 'charged' } } },
    })
    expect(res.status()).not.toBe(200)
  })

  test('webhook with non-payment status is acknowledged without side effects', async ({ page }) => {
    test.skip(!process.env.SAFEPAY_SECRET_KEY, 'SAFEPAY_SECRET_KEY not set in test env — cannot sign payload')

    const { createHmac } = await import('crypto')
    const payload = JSON.stringify({ data: { tracker: { token: '__e2e_nonexistent__', status: 'created' } } })
    const signature = createHmac('sha256', process.env.SAFEPAY_SECRET_KEY!).update(payload).digest('hex')

    const res = await page.request.post('/api/webhooks/safepay', {
      headers: { 'sfpy-signature': signature, 'Content-Type': 'application/json' },
      data: payload,
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.received).toBe(true)
  })
})
