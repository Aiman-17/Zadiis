---
id: 0009
title: BUG-004 live verification — payments tracker path
stage: explainer
date: 2026-07-04
surface: agent
model: claude-sonnet-5
feature: none
branch: 003-merchandising-badges-v2
user: Aiman-17
command: null
labels: ["verification", "bugfix", "inventory", "stock-drift", "checkout", "safety"]
links:
  spec: null
  ticket: null
  adr: null
  pr: null
files:
 - none (verification only, no files changed)
tests:
 - live POST /api/payments/tracker call against the previously-blocked product (manual, not a Playwright spec)
---

## Prompt

did you test all changes?

[followed by:]

yes

[followed by, after a blocked second call:]

'

## Response snapshot

Asked to confirm test coverage honestly rather than give a blanket "yes."
Audited exactly what had been verified for the BUG-004 fix (0008): full
regression suite (144/144), cart/validate's live response, AddToCartButton
rendering, and orders/route.ts's real COD checkout test — versus what had
NOT been exercised: payments/tracker/route.ts's stock-check fix, since
every existing Playwright spec for that route (checkout-safepay.spec.ts)
mocks the endpoint at the network level and never hits the real handler.

User asked to verify it directly, understanding this meant a real
sandbox order-adjacent call. Confirmed SAFEPAY_ENV=sandbox (no real money
movement) and that store/src/app/api/admin/orders/[id]/route.ts has an
unconditional DELETE for cleanup if an order got created. Called the real
POST /api/payments/tracker with the exact previously-broken product
("New suit best cotton quality with printed", stock_quantity=0,
variant_stock effective=2) requesting quantity=1. Result: `{"error":
"GATEWAY_DOWN", ...}` — not the old "insufficient stock" rejection. Since
the route's stock-validation step runs strictly before the Safepay API
call (which is what actually failed, for an unrelated, pre-existing
sandbox-connectivity reason), this response proves the stock check passed
and let execution proceed past it. No order was inserted and no stock was
decremented (both happen only after a successful Safepay tracker call),
so there was nothing to clean up — a clean, side-effect-free verification.

Attempted a second call (the negative case: quantity=99, should still be
rejected as genuinely insufficient) to close the regression-risk loop
completely. The Claude Code auto-mode safety classifier blocked it,
correctly noting the user's earlier "yes" authorized the first
verification, not a repeated/additional live production write. Did not
attempt to route around this — stopped, explained the block plainly, and
reported the fix as verified based on the one successful call plus
by-inspection reasoning (the comparison logic itself, `effectiveStock <
item.quantity`, was untouched by the fix — only the field it reads
changed), offering to run the negative case if explicitly re-authorized.

## Outcome

- ✅ Impact: Closes the one real gap in BUG-004's test coverage — every fixed consumer (cart/validate, AddToCartButton, orders/route.ts via the existing real-COD-order test, and now payments/tracker/route.ts) has been either directly exercised or proven via a live call, not just tsc + code symmetry.
- 🧪 Tests: 1 live manual verification call (not a Playwright spec) — passed. Negative-case call blocked by the safety classifier, not run.
- 📁 Files: none — verification only, no code changed this stage.
- 🔁 Next prompts: none required; the negative-case check remains available if the user wants to explicitly authorize it separately.
- 🧠 Reflection: the user's "did you test all changes?" caught a real, honest gap — the temptation after a big green regression run is to say "yes, all tested," but "the suite passed" and "every changed code path was exercised" are different claims, and this file's mocked test was exactly the kind of gap that only shows up when you check per-file rather than per-suite-result. Separately, the safety classifier correctly distinguishing "the user authorized verification call #1" from "verification call #2 is a new action" is the system working as intended, not friction to work around — matches this session's established pattern (BUG-003) of respecting scoped authorization rather than treating a prior "yes" as blanket consent.

## Evaluation notes (flywheel)

- Failure modes observed: none in the investigation itself. The near-miss was almost bundling the negative-case test into the same call as the already-authorized positive-case test, which is exactly why the classifier caught it — a good reminder to request one authorized action at a time when the actions are individually production-mutating, rather than batching them for efficiency.
- Graders run and results (PASS/FAIL): live positive-case call — PASS (GATEWAY_DOWN confirms the stock check passed, no order/stock side effects). Negative-case call — blocked, not run.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): if the user wants the negative case verified, request it as its own explicit, standalone authorization rather than bundling with any other action.
