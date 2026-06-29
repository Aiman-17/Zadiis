---
id: "024"
title: Fix Safepay Session Does Not Validate Error
stage: general
date: 2026-06-23
surface: agent
model: claude-sonnet-4-6
feature: none
branch: main
user: Aiman-17
command: continue session — fix Safepay "Your session does not validate for either a payment or subscription"
labels: ["safepay","payment","debugging","bug-fix"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
  - store/src/app/api/payments/tracker/route.ts
tests:
  - manual: redirect to getsafepay.com checkout page and verify payment form loads
---

## Prompt

(Continuation of prior session) Fix the Safepay checkout error: "Your session does not validate for either a payment or subscription". The error appeared after fixing the previous issues (503 from wrong request body format, DNS_PROBE for wrong checkout domain, "Required environment is missing" from wrong `env` param name). All prior fixes committed. Current error fires after redirect to getsafepay.com/checkout.

## Response snapshot

Root cause found by reading Safepay's minified checkout JS bundle (`main.606b94d9.chunk.js`).

The URL parameter parsing function in their React app:
```javascript
A = fc(e.beacon),   // tracker is read from `beacon`, NOT `tracker`
...
return {cof:t, environment:n, tracker:A, orderId:a, ...}
```

`urlParams.tracker` is populated from `e.beacon` (the `beacon` URL param), not `e.tracker`. We were sending `?tracker=track_xxx` so `e.beacon` was undefined → `urlParams.tracker = undefined` → `isPayment = !!undefined = false` → redirect to error page.

Also confirmed `redirect_url` is the correct param name (maps to `successUrl` internally via `fc(e.redirect_url)`).

**Fix:** Changed `tracker=${trackerToken}` to `beacon=${trackerToken}` in the checkout URL.

```typescript
// Before
const checkoutUrl = `${SAFEPAY_CHECKOUT_BASE}/checkout?tracker=${trackerToken}&source=checkout&env=${SAFEPAY_ENV}&redirect_url=${...}`
// After
const checkoutUrl = `${SAFEPAY_CHECKOUT_BASE}/checkout?beacon=${trackerToken}&source=checkout&env=${SAFEPAY_ENV}&redirect_url=${...}`
```

Committed: `20d3f8e`

## Outcome

- ✅ Impact: Safepay checkout page should now correctly identify the tracker token and show the payment form instead of the error page
- 🧪 Tests: Manual — place order with card/JazzCash/Easypaisa and verify getsafepay.com shows payment form; then test webhook flow
- 📁 Files: store/src/app/api/payments/tracker/route.ts (1 line changed)
- 🔁 Next prompts: end-to-end payment test; Sprint 4 implementation (trust bar, policy pages, SEO, sale page)
- 🧠 Reflection: The URL param name `beacon` vs `tracker` was only discoverable by reading Safepay's minified JS — their docs don't expose this detail. Required 4 rounds of JS analysis to get here.

## Evaluation notes (flywheel)

- Failure modes observed: Wrong URL param name (`tracker` instead of `beacon`) — not documented in Safepay's public API docs; only in their checkout SPA source
- Graders run and results (PASS/FAIL): pending manual E2E test
- Prompt variant (if applicable): N/A
- Next experiment (smallest change to try): If checkout still fails, check whether Safepay sandbox actually processes payments or requires prod keys for card payments
