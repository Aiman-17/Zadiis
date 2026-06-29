---
id: "020"
title: Checkout Safepay Redirect Gateway Down Fallback
stage: general
date: 2026-06-21
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: /sp.phr
labels: ["checkout", "safepay", "payments", "gateway-down", "sprint3", "task-7"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/(store)/checkout/page.tsx
tests:
  - npx tsc --noEmit (0 errors)
---

## Prompt

implement checkout safepay redirect gateway-down fallback

## Response snapshot

Replaced `store/src/app/(store)/checkout/page.tsx` in full per Task 7 brief. Verified `getCart`, `clearCart`, and `CartItem` exports all exist in `@/lib/cart-store.ts` unchanged. Wrote the new file, ran `npx tsc --noEmit` (zero errors), and committed at `8f999ff`. Wrote task report to `.git/sdd/task-7-report.md`.

## Outcome

- ✅ Impact: Checkout now routes online payments (jazzcash/easypaisa/card) through `/api/payments/tracker` for Safepay hosted redirect; GATEWAY_DOWN response renders a 3-option fallback UI (switch to COD, pay manually with account numbers, try again); COD flow unchanged; changing payment method clears gatewayDown state; submit button hidden while fallback panel is visible.
- 🧪 Tests: TypeScript check — `cd store && npx tsc --noEmit` — 0 errors
- 📁 Files: store/src/app/(store)/checkout/page.tsx (134 insertions, 69 deletions)
- 🔁 Next prompts: Implement `/api/payments/tracker` route if not yet done; add Safepay webhook handler for payment confirmation; test GATEWAY_DOWN path end-to-end
- 🧠 Reflection: Verifying cart-store exports before writing saved potential import-path debugging time; the brief's exact code matched the existing import structure perfectly.

## Evaluation notes (flywheel)

- Failure modes observed: None. Imports matched exactly; TypeScript passed clean.
- Graders run and results (PASS/FAIL): tsc --noEmit PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): Add an E2E Playwright test that mocks `/api/payments/tracker` returning `GATEWAY_DOWN` and verifies the fallback panel renders all three options.
