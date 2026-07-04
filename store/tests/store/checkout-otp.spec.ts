import { test, expect } from '@playwright/test'
import { seedCartAndGoToCheckout, fillCheckoutForm } from '../helpers/cart'
import { mockOtp, completeOtp, TEST_OTP } from '../helpers/otp'

/**
 * US2 — Customer email OTP verification at checkout.
 *
 * Real flow: sending is a deliberate click on the send-arrow button next to
 * the email field (accessible name "Send verification code") — blurring the
 * field alone does nothing. Clicking it shows an inline 6-digit input
 * (placeholder "000000"); typing 6 digits auto-calls POST /api/otp/verify.
 * Order submission is blocked until the state is "verified". Send/verify are
 * mocked at the API boundary — the UI flow under test is real.
 */

const EMAIL = 'e2e-test@zadiis.test'

test.describe('Checkout email OTP verification', () => {

  test('blurring the email field alone does not send a code', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('textbox', { name: /email/i }).blur()

    await expect(page.getByPlaceholder('000000')).not.toBeVisible({ timeout: 3_000 })
  })

  test('clicking the send button sends exactly one code', async ({ page }) => {
    let sendCount = 0
    await page.route('**/api/otp/send', (route) => {
      sendCount++
      return route.fulfill({ json: { success: true } })
    })
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()

    await expect(page.getByText(/Enter the 6-digit code sent to/i)).toBeVisible({ timeout: 8_000 })
    await expect(page.getByPlaceholder('000000')).toBeVisible()
    expect(sendCount).toBe(1)
  })

  test('clicking send with an empty or invalid email shows a validation message and sends nothing', async ({ page }) => {
    let sendCount = 0
    await page.route('**/api/otp/send', (route) => {
      sendCount++
      return route.fulfill({ json: { success: true } })
    })
    await seedCartAndGoToCheckout(page)

    // Empty email
    await page.getByRole('button', { name: /send verification code/i }).click()
    await expect(page.getByText(/email is required/i)).toBeVisible({ timeout: 3_000 })

    // Malformed email
    await page.getByRole('textbox', { name: /email/i }).fill('not-an-email')
    await page.getByRole('button', { name: /send verification code/i }).click()
    await expect(page.getByText(/valid email address/i)).toBeVisible({ timeout: 3_000 })

    expect(sendCount).toBe(0)
  })

  test('rapid repeated clicks before the first send resolves produce exactly one call', async ({ page }) => {
    let sendCount = 0
    await page.route('**/api/otp/send', async (route) => {
      sendCount++
      await new Promise(r => setTimeout(r, 500)) // hold the response open
      await route.fulfill({ json: { success: true } })
    })
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    const sendButton = page.getByRole('button', { name: /send verification code/i })
    await sendButton.click()
    // Button disables while sending — a second click while disabled is a no-op click,
    // but assert the guard held regardless of timing
    await sendButton.click({ force: true }).catch(() => {})
    await sendButton.click({ force: true }).catch(() => {})

    await expect(page.getByPlaceholder('000000')).toBeVisible({ timeout: 8_000 })
    expect(sendCount).toBe(1)
  })

  test('correct code marks email verified', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await completeOtp(page)

    await expect(page.getByText('✓ Verified')).toBeVisible()
  })

  test('wrong code shows error and does not verify', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()

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
    // COD may be disabled in settings — fall back to any available method so
    // the guard under test (OTP, not payment-method selection) is reached.
    const cod = page.getByText(/Cash on Delivery/i)
    if (await cod.isVisible().catch(() => false)) await cod.click()
    else await page.getByText(/JazzCash/i).click()
    await page.getByRole('button', { name: /Place Order/i }).click()

    await expect(page.getByText(/verify your email/i)).toBeVisible({ timeout: 8_000 })
    expect(page.url()).toContain('/checkout')
  })

  test('resend is rate-limited by an 80-second cooldown after first send', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()
    await expect(page.getByPlaceholder('000000')).toBeVisible({ timeout: 8_000 })

    // Client enforces an 80s cooldown: button reads "Resend in Ns" and is disabled
    const resendBtn = page.getByRole('button', { name: /Resend in \d+s/ })
    await expect(resendBtn).toBeVisible()
    await expect(resendBtn).toHaveText(/Resend in 80s/)
    await expect(resendBtn).toBeDisabled()
  })

  test('server rate-limit error from send is surfaced to the customer', async ({ page }) => {
    // Regression test for BUG-001 (fixed 2026-07-03): send errors now render
    // under the email field even when the OTP box is unmounted.
    await page.route('**/api/otp/send', (route) =>
      route.fulfill({
        status: 429,
        json: { error: 'A code was already sent. Please wait 80 seconds before requesting a new one.' },
      })
    )
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()

    await expect(page.getByText(/wait 80 seconds/i)).toBeVisible({ timeout: 8_000 })
    // OTP input never appeared — send failed
    await expect(page.getByPlaceholder('000000')).not.toBeVisible()
  })

  test('changing a verified email resets verification', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await completeOtp(page, TEST_OTP)

    // Edit the email — verified badge must disappear (re-verification required)
    await page.getByRole('textbox', { name: /email/i }).fill('different@zadiis.test')
    await expect(page.getByText('✓ Verified')).not.toBeVisible()
  })

  test('changing the email after a code is sent (before verifying) resets the cooldown and code box', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()
    await expect(page.getByPlaceholder('000000')).toBeVisible({ timeout: 8_000 })

    await page.getByRole('textbox', { name: /email/i }).fill('different@zadiis.test')

    await expect(page.getByPlaceholder('000000')).not.toBeVisible()
    // Send control must be usable again immediately, not stuck on the old cooldown
    await expect(page.getByRole('button', { name: /send verification code/i })).toBeEnabled()
  })

  test('spam/junk folder guidance is visible while waiting for a code', async ({ page }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    await page.getByRole('textbox', { name: /email/i }).fill(EMAIL)
    await page.getByRole('button', { name: /send verification code/i }).click()

    await expect(page.getByText(/check your spam or junk folder/i)).toBeVisible({ timeout: 8_000 })
  })

  test('switching tabs during the cooldown preserves cart, form, and cooldown state', async ({ page, context }) => {
    await mockOtp(page)
    await seedCartAndGoToCheckout(page)

    const data = await fillCheckoutForm(page)
    await page.getByRole('button', { name: /send verification code/i }).click()
    await expect(page.getByPlaceholder('000000')).toBeVisible({ timeout: 8_000 })

    // Simulate leaving to check another mail folder in a new tab, then returning
    const otherTab = await context.newPage()
    await otherTab.goto('about:blank')
    await otherTab.close()
    await page.bringToFront()

    await expect(page.getByRole('textbox', { name: /full name/i })).toHaveValue(data.name)
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveValue(EMAIL)
    await expect(page.getByPlaceholder('000000')).toBeVisible()
    await expect(page.getByRole('button', { name: /Resend in \d+s/ })).toBeVisible()
  })
})
