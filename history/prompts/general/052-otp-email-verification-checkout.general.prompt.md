---
name: 052-otp-email-verification-checkout
description: Implement OTP email verification on checkout — auto-send on email blur, inline code input, green tick when verified, blocks order submission until verified
metadata:
  type: green
  stage: green
  date: 2026-06-27
  surface: agent
  model: claude-sonnet-4-6
  feature: checkout-otp
  branch: main
  user: aurex707@gmail.com
  command: "implement OTP email verification on checkout"
  labels: ["otp", "checkout", "email-verification", "resend", "supabase"]
  links:
    spec: "null"
    ticket: "null"
    adr: "null"
    pr: "null"
---

## Prompt

> no add otp instead and add field below the email field when they click checkout before redirecting to safepay send otp on thier emails. The better approah is make email field like a btn in background the visuals remains same but when they enter email the send otp so they add the code and green tick confirm.

## Response

Implemented full OTP email verification on the checkout page.

### Files Created

- `store/src/app/api/otp/send/route.ts` — POST `/api/otp/send`: validates email, rate-limits (60s/email), deletes old OTPs, generates 6-digit code, stores in `email_otps` table, sends via Resend
- `store/src/app/api/otp/verify/route.ts` — POST `/api/otp/verify`: fetches non-expired, unverified OTP for email, checks code, tracks attempts (max 5), marks verified

### Files Modified

- `store/src/lib/email.ts` — added `sendOtpEmail(to, otp)` function with ZADIIS-branded template
- `store/src/app/(store)/checkout/page.tsx`:
  - Added OTP state: `otpState`, `otpCode`, `otpError`, `verifiedEmail`, `resendCooldown`
  - Added `sendOtp()`, `handleEmailBlur()`, `handleOtpChange()` functions
  - Email field: green border + "✓ Verified" label when verified, "Sending…" inline while sending
  - OTP panel (appears after send): 6-digit monospace input, auto-verifies at 6 digits, error text, resend button with 60s cooldown
  - `handleSubmit` blocks order placement if `otpState !== 'verified'`

### Manual Step Required

Run in Supabase SQL editor:
```sql
CREATE TABLE IF NOT EXISTS email_otps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts int DEFAULT 0,
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_otps_email_idx ON email_otps(email);
```

## Outcome

OTP verification fully blocks both COD and Safepay payment paths until email is confirmed. Email field visuals are unchanged. Code input appears inline below the field with auto-verify on 6-digit entry.
