import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export const TEST_OTP = '654321'

/**
 * Mock the OTP boundary so no real email is sent and the code is deterministic.
 *
 * Real flow (checkout page): the email field's blur handler calls
 * POST /api/otp/send, an inline 6-digit input (placeholder "000000") appears,
 * and typing 6 digits auto-calls POST /api/otp/verify.
 *
 * With this mock, `code` verifies successfully; any other 6-digit value
 * returns the same error shape the real API uses.
 */
export async function mockOtp(page: Page, code: string = TEST_OTP) {
  await page.route('**/api/otp/send', (route) =>
    route.fulfill({ json: { success: true } })
  )
  await page.route('**/api/otp/verify', async (route) => {
    const body = route.request().postDataJSON() as { otp?: string }
    if (body?.otp === code) {
      await route.fulfill({ json: { success: true } })
    } else {
      await route.fulfill({ status: 400, json: { error: 'Invalid or expired code. Please try again.' } })
    }
  })
}

/**
 * Complete inline email verification on the checkout page with the mocked code.
 * Assumes mockOtp() was installed and the email field has been filled.
 *
 * Sending is a deliberate customer action (send-arrow button next to the
 * email field), not automatic on blur — this helper clicks it before waiting
 * for the code box, so existing callers don't need to know about the button.
 */
export async function completeOtp(page: Page, code: string = TEST_OTP) {
  const sendButton = page.getByRole('button', { name: /send verification code/i })
  if (await sendButton.isVisible().catch(() => false)) {
    await sendButton.click()
  }
  const otpInput = page.getByPlaceholder('000000')
  await expect(otpInput).toBeVisible({ timeout: 8_000 })
  await otpInput.fill(code)
  await expect(page.getByText('✓ Verified')).toBeVisible({ timeout: 8_000 })
}
