import { test, expect } from '@playwright/test'
import { seedCartAndGoToCheckout, fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp, TEST_OTP } from '../helpers/otp'

/**
 * US2 — Customer email OTP verification at checkout.
 *
 * Real flow: blurring a valid email auto-calls POST /api/otp/send, an inline
 * 6-digit input (placeholder "000000") appears below the email field, and
 * typing 6 digits auto-calls POST /api/otp/verify. Order submission is
 * blocked until the state is "verified". Send/verify are mocked at the API
 * boundary — the UI flow under test is real.
 */

test.describe('Checkout email OTP verification', () => {

  test('OTP input appears after entering a valid email', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()

    await expect(page.getByText(/Enter the 6-digit code sent to/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByPlaceholder('000000')).toBeVisible()
  })

  test('correct code marks email verified', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()
    await completeOtp(page)

    await expect(page.getByText('✓ Verified')).toBeVisible()
  })

  test('wrong code shows error and does not verify', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()

    const otpInput = page.getByPlaceholder('000000')
    await expect(otpInput).toBeVisible({ timeout: 8_000 })
    await otpInput.fill('000001')

    await expect(page.getByText(/Invalid or expired code/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('✓ Verified')).not.toBeVisible()
  })

  test('submitting order without verifying email is blocked', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    // Fill everything but never complete the OTP
    await fillCheckoutForm(page)
    const cod = page.getByText(/Cash on Delivery/i)
    if (await cod.isVisible().catch(() => false)) await cod.click()
    await page.getByRole('button', { name: /Place Order/i }).click()

    await expect(page.getByText(/verify your email/i)).toBeVisible({ timeout: 8_000 })
    expect(page.url()).toContain('/checkout')
  })

  test('resend is rate-limited by a visible cooldown after first send', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()
    await expect(page.getByPlaceholder('000000')).toBeVisible({ timeout: 8_000 })

    // Client enforces a 60s cooldown: button reads "Resend in Ns" and is disabled
    const resendBtn = page.getByRole('button', { name: /Resend in \d+s/ })
    await expect(resendBtn).toBeVisible()
    await expect(resendBtn).toBeDisabled()
  })

  test('server rate-limit error from send is surfaced to the customer', async ({ page }) => {
    // Regression test for BUG-001 (fixed 2026-07-03): send errors now render
    // under the email field even when the OTP box is unmounted.
    // Override the send route BEFORE navigation: respond like the real 60s limiter
    await page.route('**/api/otp/send', (route) =>
      route.fulfill({
        status: 429,
        json: { error: 'A code was already sent. Please wait 60 seconds before requesting a new one.' },
      })
    )
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()

    await expect(page.getByText(/wait 60 seconds/i)).toBeVisible({ timeout: 8_000 })
    // OTP input never appeared — send failed
    await expect(page.getByPlaceholder('000000')).not.toBeVisible()
  })

  test('changing a verified email resets verification', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill('e2e-test@zadiis.test')
    await page.getByRole('textbox', { name: /email/i }).blur()
    await completeOtp(page, TEST_OTP)

    // Edit the email — verified badge must disappear (re-verification required)
    await page.getByRole('textbox', { name: /email/i }).fill('different@zadiis.test')
    await expect(page.getByText('✓ Verified')).not.toBeVisible()
  })
})
