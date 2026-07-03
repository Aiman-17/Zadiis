# BUG-001 — OTP send failure error is never shown to the customer

| Field | Value |
|---|---|
| **Title** | Checkout: OTP send error (rate limit / server failure) is silently swallowed |
| **Severity** | Medium |
| **Priority** | P2 |
| **Category** | Functional / UX — error handling |
| **Component** | `store/src/app/(store)/checkout/page.tsx` (OTP email verification) |
| **Environment** | All — code-level defect, reproduced on local production build (Next 16.2.7), Chromium |
| **Status** | Open |
| **Found by** | E2E test `checkout-otp.spec.ts › server rate-limit error from send is surfaced to the customer` |
| **Date** | 2026-07-02 |

## Preconditions
- Cart has at least one item; customer is on `/checkout`
- `POST /api/otp/send` returns an error (e.g. HTTP 429 `{ "error": "A code was already sent. Please wait 60 seconds…" }` — the real rate limiter does exactly this)

## Steps to Reproduce
1. Go to `/checkout` with an item in the cart
2. Enter a valid email and blur the field (triggers OTP auto-send)
3. Have the send API respond with an error (happens naturally when re-requesting within 60s, or when the email service is down)

## Expected Result
The customer sees the error message (e.g. "A code was already sent. Please wait 60 seconds before requesting a new one.") near the email field.

## Actual Result
Nothing visible changes. No error appears anywhere. The customer is left waiting for a code that was never sent, with no explanation.

## Root Cause
In `sendOtp()` (checkout/page.tsx ~line 71):

```ts
if (data.error) {
  setOtpError(data.error)
  setOtpState('idle')   // ← state reset to 'idle'
  return
}
```

But `otpError` is only rendered inside the OTP input box (~line 435), which is conditionally mounted with:

```tsx
{(otpState === 'sent' || otpState === 'verifying') && ( ... {otpError && <p>{otpError}</p>} ... )}
```

When the send fails, state is `'idle'`, so the container holding the error message is unmounted — the error is set in React state but has no render path.

## Business Impact
A customer whose OTP send fails (rate limit, email service hiccup) sees a dead checkout with no feedback. Most will assume the site is broken and abandon the order — direct revenue loss on the highest-intent page.

## Technical Impact
Low complexity, isolated to one component. No data integrity issues.

## Recommended Fix
Render `otpError` outside the `sent/verifying`-gated box — e.g. directly under the email field whenever `otpError` is non-null, regardless of `otpState`. One-line JSX move.

## Regression Risk
Minimal — display-only change. Re-run `checkout-otp.spec.ts` after fixing; the test `server rate-limit error from send is surfaced to the customer` (currently `test.fixme`) should be re-enabled and pass.
