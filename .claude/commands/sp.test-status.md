---
description: Scan all Playwright spec files and report which journeys are covered, missing, or skipped.
handoffs:
  - label: Quality Review
    agent: sp.quality-review
    prompt: Run quality review on an area with missing coverage
  - label: File Bug Report
    agent: sp.bug-report
    prompt: File a bug report for a failing test
---

## User Input

```text
$ARGUMENTS
```

If a specific area is provided (e.g., "admin", "checkout", "payments"), focus the
report on that area. Otherwise report on the full test suite.

---

## Your Role

You are the test coverage auditor. Read the actual spec files — do not guess.
Map every test to a journey from the constitution's Stage 10–12 checklists.
Identify what is covered, what is missing, and what is skipped.

---

## Execution Steps

### Step 1 — Read all spec files

Read every file matching these patterns:
- `store/tests/store/**/*.spec.ts`
- `store/tests/admin/**/*.spec.ts`
- `store/tests/global.setup.ts`

Also read `store/playwright.config.ts` to confirm project configuration.

### Step 2 — Inventory every `test()` and `test.describe()`

For each spec file, list:
- File path
- Describe block name
- Each `test()` name
- Whether it has `test.skip()` anywhere (mark ⏭ Skipped)

### Step 3 — Map to journey checklist

Map each test to the relevant journey category from the constitution:

**Store journeys (Stage 12):**
Homepage | Navigation | Authentication | Product Discovery | Search | Filters |
Collections | Product Details | Cart | Checkout | Payment | Order Tracking |
Returns | Profile | Wishlist | Reviews | Notifications

**Admin journeys (Stage 11):**
Dashboard | Product Management | Inventory | Categories | Orders | Customers |
Discounts | Payments | Refunds | Returns | Shipping | Analytics | Settings

### Step 4 — Identify gaps

For each journey in the Stage 11 and Stage 12 checklists:
- ✅ **Covered** — at least one non-skipped test exists
- ⏭ **Skipped** — test exists but uses `test.skip()`
- ❌ **Missing** — no test exists for this journey

### Step 5 — Produce the report

---

## Report Format

```
## E2E Test Coverage Status — <date>

### Summary
Total spec files: X
Total tests: X  |  Passing (assumed): X  |  Skipped: X  |  Missing journeys: X

### Store Coverage (Stage 12)
| Journey | Status | Test File | Notes |
|---|---|---|---|
| Homepage | ✅ | store/home.spec.ts | 3 tests |
| Checkout | ✅ | store/checkout.spec.ts | 9 tests |
| Payment — Safepay | ❌ | — | No E2E test |
| Order Tracking | ❌ | — | No test |
| Returns | ❌ | — | No test |
...

### Admin Coverage (Stage 11)
| Journey | Status | Test File | Notes |
|---|---|---|---|
| Auth Guard | ✅ | admin/auth.spec.ts | 7 tests |
| Product CRUD | ✅ | admin/products.spec.ts | X tests |
| Payments Page | ❌ | — | No test |
| Analytics | ❌ | — | No test |
...

### Skipped Tests
List any test.skip() calls with reason if documented.

### Priority Gaps (P1 first)
1. [P1] Payment — Safepay redirect flow — no E2E test; checkout is a revenue-critical path
2. [P1] Order Tracking — customers cannot self-serve without this working
3. [P2] Returns flow — admin + customer side both untested
...

### Recommended Next Tests
List the 3 highest-priority missing tests with suggested file locations.
```

---

## Quality Guardian Verdict

After the report, give a verdict on the overall test suite health:

- ❌ **Reject** — critical journey has zero coverage (checkout, auth, orders)
- ⚠️ **Conditionally Approve** — core journeys covered; gaps documented
- ✅ **Approve** — all Stages 11–12 journeys have at least one test
- 🏆 **Enterprise Grade** — happy path + negative + edge cases for every journey

---

## PHR

After completing, create a PHR at `history/prompts/general/` with stage `general`,
title "e2e test coverage status report".
