---
id: 0008
title: BUG-001 and BUG-002 fixed verified
stage: green
date: 2026-07-03
surface: agent
model: claude-fable-5
feature: 001-e2e-test-suite
branch: 001-e2e-test-suite
user: Aiman-17
command: "okay commit it then fix those bugs before fixing tell me why did you skip that"
labels: ["bugfix", "checkout", "otp", "search", "race-condition", "regression-test"]
links:
  spec: specs/001-e2e-test-suite/spec.md
  ticket: null
  adr: null
  pr: https://github.com/Aiman-17/Zadiis/pull/2
files:
 - store/src/app/(store)/checkout/page.tsx
 - store/src/components/products/ShopSearchBar.tsx
 - store/tests/store/checkout-otp.spec.ts
 - store/tests/store/shop.spec.ts
 - specs/001-e2e-test-suite/bugs/BUG-001-otp-send-error-hidden.md
 - specs/001-e2e-test-suite/bugs/BUG-002-shop-search-debounce-race.md
tests:
 - checkout-otp.spec.ts + shop.spec.ts: 17 passed / 1 conditional skip (1.2m)
 - BUG-002 regression test --repeat-each=5: 5/5 passed (was 1/5 pre-fix)
---

## Prompt

okay commit it then fix those bugs before fixing tell me why did you skip that

## Response snapshot

Explained the fixme rationale (tests-only spec scope; fixme preserves the bug
signal instead of burying it under weakened asserts; product changes require
consent). Then, with consent given:

**BUG-001 fix** — checkout/page.tsx: otpError also renders under the email
field when otpState is not sent/verifying (the failure path resets state to
'idle', unmounting the OTP box that held the only error render).

**BUG-002 fix** — ShopSearchBar.tsx: added latest-intent ref + settle effect.
router.push doesn't cancel in-flight navigations, so type-then-clear raced
two RSC responses and the slower stale one could win. Now when a navigation
settles on a URL disagreeing with the recorded intent (and no debounce is
pending), the intent is re-pushed — last user action always wins.

Both test.fixme regression tests re-enabled. Rebuilt (npm run build), server
restarted, verified: 17 passed / 1 skip; BUG-002 test 5/5 under repeat-each
(1/5 before fix). Bug reports marked Fixed. Commit aad7f71 pushed — PR #2
updated.

## Outcome

- ✅ Impact: Two revenue-relevant defects fixed — silent checkout dead-end and shop search stranding on empty results.
- 🧪 Tests: 17P/1S on affected suites; 5/5 repeat-each on the previously-racy test; both former fixmes now live regression guards.
- 📁 Files: 2 app components, 2 spec files, 2 bug reports.
- 🔁 Next prompts: optional data-testid/aria-label attributes (5 one-liners); brand ZADIIS vs ZADII'S decision; PR #2 review/merge.
- 🧠 Reflection: test.fixme → fix → un-fixme is the loop working as designed: the bug's own test was waiting to become its regression guard.

## Evaluation notes (flywheel)

- Failure modes observed: npm run build from repo root (package.json lives in store/).
- Graders run and results (PASS/FAIL): build PASS, affected suites PASS, repeat-each stress PASS.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): run the full store project once more before merging PR #2 to confirm no cross-file effects from the ShopSearchBar change.
