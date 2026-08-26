# Tasks: E2E Test Suite — ZADIIS Store

**Input**: Design documents from `/specs/001-e2e-test-suite/`
**Branch**: `001-e2e-test-suite` | **Date**: 2026-07-01
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅

> **Scope**: Write 10 new Playwright spec files + extend 1 existing file.
> Zero application code changes. Tests only.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (`[US1]`–`[US11]`)

---

## Phase 1: Setup (Shared Test Helpers)

**Purpose**: Create shared helper utilities that all stories depend on

- [X] T001 Create `store/tests/helpers/` directory and `store/tests/helpers/cart.ts` with `seedCart(page, item?)` and `seedCartAndGoToCheckout(page)` helpers (extract from `store/tests/store/checkout.spec.ts`)
- [X] T002 [P] Create `store/tests/helpers/otp.ts` with `mockOtp(page, code = '123456')` that intercepts `POST /api/otp/send` (return `{ success: true }`) and `POST /api/otp/verify` (validate against `code`)
- [X] T003 [P] Create `store/tests/helpers/orders.ts` with `getFirstOrderId(page)` that calls `GET /api/admin/orders` and returns first order `id`, or `null` if none

**Checkpoint**: Helpers exist — all user story phases can import from `../helpers/`

---

## Phase 2: Foundational (Environment Verification)

**Purpose**: Confirm test environment is healthy before writing new tests

**⚠️ CRITICAL**: Verify these pass before implementing story phases

- [X] T004 Verify `store/tests/.auth/admin.json` exists (run `npx playwright test --project=setup` from `store/` if it does not — the `global.setup.ts` creates it)
- [X] T005 [P] Verify `store/playwright.config.ts` has `testDir: './tests'`, projects `store` and `admin` are present, and `webServer` port matches 3000

**Checkpoint**: Environment confirmed — user story implementation can begin

---

## Phase 3: US1 — Safepay Payment Flow (Priority: P1) 🎯 MVP

**Goal**: Prove the Safepay card-payment path is not a silent broken path — redirect fires correctly, webhook updates order to paid, invalid signatures are rejected.

**Independent Test**: Run `npx playwright test checkout-safepay --project=store` from `store/`

### Implementation for US1

- [X] T006 [US1] Create `store/tests/store/checkout-safepay.spec.ts` with the following test structure:

  ```
  describe('Safepay Payment Flow')
    beforeEach: skip entire describe if !process.env.SAFEPAY_SECRET_KEY
    test 1: 'Safepay payment option is visible at checkout'
      - seedCartAndGoToCheckout(page)
      - verify Safepay radio/button is present (getByText/getByRole 'Safepay' or 'Card Payment')
    test 2: 'selecting Safepay and submitting redirects to payment gateway'
      - seedCartAndGoToCheckout(page)
      - fill form (name, phone, email, address, city)
      - intercept POST /api/payments/tracker → capture responseBody.url
      - select Safepay option, submit form
      - verify captured URL includes 'safepay.pk' or 'sfpy'
    test 3: 'cancelled Safepay payment does not confirm order'
      - mock POST /api/payments/tracker to return { url: 'http://localhost:3000/cancel' }
      - fill form, select Safepay, submit
      - verify no redirect to /order/ confirmation page
    test 4: 'Safepay webhook with valid HMAC payload creates paid order record'
      - create HMAC signature using SAFEPAY_SECRET_KEY env var + test payload
      - call page.request.post('/api/webhooks/safepay', { headers: { 'sfpy-signature': sig }, data: payload })
      - expect response.status() toBe 200
    test 5: 'Safepay webhook with invalid signature returns 401'
      - call page.request.post('/api/webhooks/safepay', { headers: { 'sfpy-signature': 'invalid' }, data: validPayload })
      - expect response.status() toBe 401
  ```

**Checkpoint**: `checkout-safepay.spec.ts` has 5 tests; runs clean or skips with clear message if env absent

---

## Phase 4: US2 — Customer OTP Email Verification (Priority: P1)

**Goal**: Prove OTP modal appears, correct code places order, wrong code is blocked, resend works.

**Independent Test**: Run `npx playwright test checkout-otp --project=store` from `store/`

### Implementation for US2

- [X] T007 [US2] Create `store/tests/store/checkout-otp.spec.ts` with the following test structure:

  ```
  describe('Customer OTP Verification')
    beforeEach: mockOtp(page, '654321')  // import from helpers/otp.ts
    test 1: 'OTP modal appears after valid checkout form submission'
      - seedCartAndGoToCheckout(page)
      - fill all checkout fields
      - click Place Order
      - expect OTP input modal visible (getByRole 'dialog' or getByText /enter.*code/i)
    test 2: 'correct OTP code submits order and redirects to confirmation'
      - seedCartAndGoToCheckout(page); fill form; click Place Order
      - wait for OTP modal
      - fill OTP input with '654321'; submit
      - expect page.url() toMatch /\/order\//
    test 3: 'wrong OTP code shows error, order not placed'
      - mockOtp set to '654321'
      - fill form; click Place Order; fill OTP with '000000'; submit
      - expect error message visible (getByText /invalid|incorrect/i)
      - expect page.url() NOT toMatch /\/order\//
    test 4: 'resend OTP button triggers new send request'
      - fill form; click Place Order; wait for modal
      - intercept next POST /api/otp/send
      - click Resend OTP button
      - expect intercept was called once
    test 5: 'rate limit error shown when resend called too quickly'
      - override mock: POST /api/otp/send → route.fulfill({ status: 429, json: { error: 'wait 60 seconds' } })
      - click Resend → expect error text visible (/wait|60 second/i)
  ```

**Checkpoint**: `checkout-otp.spec.ts` has 5 tests; OTP is fully mocked so no real email is sent

---

## Phase 5: US3 — Order Confirmation Page (Priority: P1)

**Goal**: Prove `/order/[id]` renders correctly after COD order placement, and handles unknown IDs.

**Independent Test**: Run `npx playwright test order-confirmation --project=store` from `store/`

### Implementation for US3

- [X] T008 [US3] Create `store/tests/store/order-confirmation.spec.ts` with the following test structure:

  ```
  describe('Order Confirmation Page')
    let orderId: string
    beforeAll: place one COD order via helper and capture redirect URL to extract orderId
    test 1: 'COD order redirects to /order/[id] and shows order number'
      - seedCartAndGoToCheckout(page); fill form; select COD; submit
      - expect page.url() toMatch /\/order\/[0-9a-f-]{36}/
      - expect page.getByText(/ZD-\d+/) toBeVisible()
    test 2: 'confirmation page shows customer name and items'
      - navigate to /order/${orderId}
      - expect customer name from form visible
      - expect at least one product name visible
    test 3: 'confirmation shows payment method Cash on Delivery'
      - navigate to /order/${orderId}
      - expect getByText(/cash on delivery/i) or getByText(/COD/i) toBeVisible()
    test 4: 'invalid order ID shows not-found message'
      - navigate to /order/00000000-0000-0000-0000-000000000000
      - expect getByText(/not found|no order/i) toBeVisible()
    test 5: 'WhatsApp contact link is present on confirmation page'
      - navigate to /order/${orderId}
      - expect page.locator('a[href*="wa.me"]') toBeVisible()
  ```

**Checkpoint**: `order-confirmation.spec.ts` has 5 tests; uses real COD order placement for data

---

## Phase 6: US4 — Customer Returns & Cancellations (Priority: P2)

**Goal**: Prove `/returns` and `/cancel-order` pages render and handle form submissions.

**Independent Test**: Run `npx playwright test returns --project=store` from `store/`

### Implementation for US4

- [X] T009 [US4] Create `store/tests/store/returns.spec.ts` with the following test structure:

  ```
  describe('Returns Page')
    test 1: 'returns page renders with form fields'
      - goto '/returns'
      - expect form visible; expect order number input present
    test 2: 'submitting return form with empty order number shows validation'
      - goto '/returns'; submit form without order number
      - expect validation error visible

  describe('Cancel Order Page')
    test 3: 'cancel-order page renders with form fields'
      - goto '/cancel-order'
      - expect order number input, reason selector visible
    test 4: 'submitting cancel form with invalid order number shows error'
      - goto '/cancel-order'; fill order number 'ZD-00000'; submit
      - intercept POST /api/requests/cancel → return { error: 'Order not found' }
      - expect error message visible
    test 5: 'submitting cancel form with mock valid order shows confirmation'
      - goto '/cancel-order'
      - intercept POST /api/requests/cancel → return { success: true }
      - fill order number 'ZD-12345', select reason; submit
      - expect success message visible
  ```

**Checkpoint**: `returns.spec.ts` has 5 tests; both customer self-service pages covered

---

## Phase 7: US5 — Admin Analytics Dashboard (Priority: P2)

**Goal**: Prove `/admin/analytics` renders all tabs without errors.

**Independent Test**: Run `npx playwright test analytics --project=admin` from `store/`

### Implementation for US5

- [X] T010 [P] [US5] Create `store/tests/admin/analytics.spec.ts` with the following test structure:

  ```
  describe('Admin Analytics Dashboard')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'analytics page loads without error'
      - goto '/admin/analytics'
      - expect no console errors (attach console listener)
      - expect page.getByRole('heading') visible
    test 2: 'Overview tab shows KPI cards'
      - goto '/admin/analytics'
      - click Overview tab (if not default)
      - expect at least 3 numeric KPI cards visible (revenue, orders, customers)
    test 3: 'all tab buttons are clickable without crash'
      - goto '/admin/analytics'
      - for each tab: click tab → expect no error dialog
    test 4: 'Revenue tab renders chart area'
      - goto '/admin/analytics'; click Revenue tab
      - expect SVG chart or canvas element visible
    test 5: 'Products tab renders top products section'
      - goto '/admin/analytics'; click Products tab
      - expect products list/table section visible
    test 6: 'date range selector is present'
      - goto '/admin/analytics'
      - expect date range input or select visible
  ```

**Checkpoint**: `analytics.spec.ts` has 6 tests; all tabs confirmed rendering

---

## Phase 8: US6 — Admin Payments Deep Coverage (Priority: P2)

**Goal**: Prove `/admin/payments` filter, archive, and trend chart all work.

**Independent Test**: Run `npx playwright test payments --project=admin` from `store/`

### Implementation for US6

- [X] T011 [P] [US6] Create `store/tests/admin/payments.spec.ts` with the following test structure:

  ```
  describe('Admin Payments Page')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'payments page renders without error'
      - goto '/admin/payments'
      - expect page loads, no error state
    test 2: 'filter buttons are present (Paid, Pending, All)'
      - goto '/admin/payments'
      - expect at least 2 filter options visible
    test 3: 'clicking Paid filter shows filtered list'
      - goto '/admin/payments'; click Paid filter
      - if records exist: expect each visible status badge to be Paid
      - if no records: expect empty state (data-dependent skip)
    test 4: '7-day sales trend section renders'
      - goto '/admin/payments'
      - expect trend chart or summary section visible
    test 5: 'archive action button is present on payment records'
      - goto '/admin/payments'
      - test.skip if no records
      - expect archive button/icon on first record
    test 6: 'delete action prompts confirmation before deleting'
      - goto '/admin/payments'
      - test.skip if no records
      - click delete on first record
      - expect confirmation dialog visible
  ```

**Checkpoint**: `payments.spec.ts` has 6 tests; filter + archive + trend covered

---

## Phase 9: US7 — Admin Returns Management (Priority: P2)

**Goal**: Extend existing `orders.spec.ts` to cover returns/exchanges managed within orders.

**Independent Test**: Run `npx playwright test orders --project=admin` from `store/`

### Implementation for US7

- [X] T012 [US7] Extend `store/tests/admin/orders.spec.ts` — append a new `describe` block:

  ```
  describe('Admin Orders — Returns & Exchanges')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'returns/exchanges section is accessible from orders page'
      - goto '/admin/orders'
      - expect Returns tab or section link visible (getByText /returns|exchanges/i)
    test 2: 'pending return requests list renders'
      - goto '/admin/orders'; navigate to returns section
      - test.skip if no return requests
      - expect return request row visible with status badge
    test 3: 'return request status can be updated'
      - test.skip if no pending return requests
      - click approve/reject on first return request
      - intercept PATCH /api/admin/orders/return → return { success: true }
      - expect status badge updated
  ```

**Checkpoint**: `orders.spec.ts` extended with 3 new returns tests

---

## Phase 10: US8 — Admin Sales / Discounts (Priority: P3)

**Goal**: Prove `/admin/sales` renders and create sale form is accessible.

**Independent Test**: Run `npx playwright test sales --project=admin` from `store/`

### Implementation for US8

- [X] T013 [P] [US8] Create `store/tests/admin/sales.spec.ts` with the following test structure:

  ```
  describe('Admin Sales / Discounts')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'sales page renders'
      - goto '/admin/sales'; expect page loads
    test 2: 'Add New Sale button is visible'
      - goto '/admin/sales'
      - expect getByRole('button', { name: /new sale|add sale/i }) toBeVisible()
    test 3: 'create sale form opens and shows required fields'
      - goto '/admin/sales'; click Add New Sale
      - expect form visible; expect fields: name/title, discount %, date inputs
    test 4: 'active sales list renders (data-dependent)'
      - goto '/admin/sales'
      - test.skip if no sales exist
      - expect at least one sale row with name and status
    test 5: 'deactivate sale action is present on active sale'
      - goto '/admin/sales'
      - test.skip if no active sales
      - expect deactivate/toggle button on first active sale
  ```

**Checkpoint**: `sales.spec.ts` has 5 tests; discounts admin fully covered

---

## Phase 11: US9 — Admin Settings & Shipping (Priority: P3)

**Goal**: Prove `/admin/settings` renders, fields are editable, delivery zones visible.

**Independent Test**: Run `npx playwright test settings --project=admin` from `store/`

### Implementation for US9

- [X] T014 [P] [US9] Create `store/tests/admin/settings.spec.ts` with the following test structure:

  ```
  describe('Admin Settings')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'settings page renders'
      - goto '/admin/settings'; expect page loads, heading visible
    test 2: 'free delivery threshold field is visible and editable'
      - goto '/admin/settings'
      - locate threshold input (getByLabel /free delivery/i or getByPlaceholder)
      - expect input.isEditable() toBeTrue
    test 3: 'save settings button is present'
      - goto '/admin/settings'
      - expect getByRole('button', { name: /save/i }) toBeVisible()
    test 4: 'delivery zone city charges section renders'
      - goto '/admin/settings'
      - expect delivery zones section visible (getByText /delivery|zone|city/i)
    test 5: 'city delivery charge input is editable'
      - goto '/admin/settings'
      - locate first city charge input in delivery zones
      - expect input.isEditable() toBeTrue
    test 6: 'saving settings succeeds (mock API)'
      - goto '/admin/settings'
      - intercept PUT/POST /api/admin/settings → return { success: true }
      - click Save; expect success toast or no error state
  ```

**Checkpoint**: `settings.spec.ts` has 6 tests; settings + delivery zones both verified

---

## Phase 12: US10 — Admin Inventory Management (Priority: P3)

**Goal**: Prove variant stock sections exist within product edit pages.

**Independent Test**: Run `npx playwright test inventory --project=admin` from `store/`

### Implementation for US10

- [X] T015 [P] [US10] Create `store/tests/admin/inventory.spec.ts` with the following test structure:

  ```
  describe('Admin Inventory (Product Variants)')
    use: { storageState: 'tests/.auth/admin.json' }
    let productId: string
    beforeAll: goto '/admin/products'; capture href of first product edit link → extract id
    test.skip entire file if no products exist

    test 1: 'product edit page shows variant stock section'
      - goto `/admin/products/${productId}/edit`
      - expect stock/inventory section visible (getByText /stock|inventory|variant/i)
    test 2: 'variant size/color rows are displayed'
      - goto `/admin/products/${productId}/edit`
      - expect at least one variant row visible
    test 3: 'stock count input is visible and editable per variant'
      - goto `/admin/products/${productId}/edit`
      - locate stock input for first variant
      - expect input.isEditable() toBeTrue
    test 4: 'saving updated stock shows success (mock API)'
      - intercept PATCH/PUT product API → return { success: true }
      - change stock input value; click Save
      - expect success toast or page reload without error
  ```

**Checkpoint**: `inventory.spec.ts` has 4 tests; variant stock management confirmed

---

## Phase 13: US11 — Admin Invoices (Priority: P3)

**Goal**: Prove `/admin/invoices` page is accessible and prints correctly.

**Independent Test**: Run `npx playwright test invoices --project=admin` from `store/`

### Implementation for US11

- [X] T016 [P] [US11] Create `store/tests/admin/invoices.spec.ts` with the following test structure:

  ```
  describe('Admin Invoices')
    use: { storageState: 'tests/.auth/admin.json' }
    test 1: 'invoices page renders'
      - goto '/admin/invoices'; expect page loads
    test 2: 'invoice list renders (data-dependent)'
      - goto '/admin/invoices'
      - test.skip if no invoices (check for empty state)
      - expect at least one invoice row visible
    test 3: 'invoice print link is present on records'
      - goto '/admin/invoices'
      - test.skip if no invoices
      - expect link/button containing /print/i on first invoice
  ```

**Checkpoint**: `invoices.spec.ts` has 3 tests; basic smoke coverage complete

---

## Phase 14: Polish & Cross-Cutting Concerns

**Purpose**: Suite-level validation and cleanup

- [X] T017 Run `npx playwright test --project=store` from `store/` directory and confirm exit 0 (or document any data-dependent skips) — GREEN 2026-07-03: 65 passed / 6 conditional skips (BUG-001 fixme, BUG-002 fixme, SAFEPAY_SECRET_KEY-gated webhook test, mobile-only drawer, data-dependent) in 7.2m
- [X] T018 [P] Run `npx playwright test --project=admin` from `store/` directory and confirm exit 0 — GREEN 2026-07-03: 58 passed / 6 conditional skips in 3.5m (after fixing 14 legacy-locator test bugs: ?from= redirect param, real orders tab strip, badge-toggle product form controls, target=_blank print link, strict-mode collisions)
- [X] T019 [P] Audit all new spec files for permanent `test.skip()` calls — ensure every skip has a `test.skip(condition, reason)` form with a runtime condition — DONE 2026-07-03 via playwright-test-reviewer agent: zero permanent skips; both test.fixme calls reference filed bugs (BUG-001, BUG-002). Bonus findings fixed: 15 unjustified waitForTimeout calls replaced with polling waits. Remaining (needs app-code consent): 4 CSS-class icon locators (svg.lucide-*) want data-testid; cart remove button lacks aria-label
- [X] T020 Run `/sp.test-status` and verify no ❌ Missing journeys remain for Stages 11 and 12 — DONE 2026-07-03: every implemented journey covered (135 tests, 19 files); remaining ❌ entries map 1:1 to deferred spec stories (wishlist, reviews, profiles, courier tracking, email links, refunds). Verdict: ✅ Approve. PHR: history/prompts/general/069

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion
- **Phases 3–13 (User Stories)**: All depend on Phase 1+2 completion
  - US1 (Safepay), US2 (OTP), US3 (Order Confirmation): can run in **parallel** (all P1)
  - US4 (Returns), US5 (Analytics), US6 (Payments), US7 (Orders+Returns): can run in **parallel** after P1 done
  - US8 (Sales), US9 (Settings), US10 (Inventory), US11 (Invoices): can run in **parallel** after P2 done
- **Phase 14 (Polish)**: Depends on all story phases complete

### User Story Dependencies

| Story | Priority | Depends On | Can Parallel |
|---|---|---|---|
| US1 Safepay | P1 | Phase 1+2 | US2, US3 |
| US2 OTP | P1 | Phase 1+2 | US1, US3 |
| US3 Order Confirmation | P1 | Phase 1+2 | US1, US2 |
| US4 Returns | P2 | Phase 1+2 | US5, US6, US7 |
| US5 Analytics | P2 | Phase 1+2 | US4, US6, US7 |
| US6 Payments | P2 | Phase 1+2 | US4, US5, US7 |
| US7 Orders+Returns | P2 | Phase 1+2 | US4, US5, US6 |
| US8 Sales | P3 | Phase 1+2 | US9, US10, US11 |
| US9 Settings | P3 | Phase 1+2 | US8, US10, US11 |
| US10 Inventory | P3 | Phase 1+2 | US8, US9, US11 |
| US11 Invoices | P3 | Phase 1+2 | US8, US9, US10 |

### Within Each Story

- Read relevant existing tests first (for conventions)
- Write tests in order listed (happy-path before negative-path)
- `test.skip(condition, reason)` for data-dependent — never unconditional skip
- Run story spec file independently before moving to next

---

## Parallel Example: P1 Stories (After Phase 2 Complete)

```bash
# Three P1 stories in parallel — all different files, no cross-dependency:
Task 1: "Create store/tests/store/checkout-safepay.spec.ts (T006)"
Task 2: "Create store/tests/store/checkout-otp.spec.ts (T007)"  
Task 3: "Create store/tests/store/order-confirmation.spec.ts (T008)"
```

---

## Implementation Strategy

### MVP First (P1 Stories Only — 3 files)

1. Complete Phase 1: Setup helpers
2. Complete Phase 2: Verify environment
3. Complete Phases 3–5: US1 + US2 + US3 (can run in parallel)
4. **VALIDATE**: `npx playwright test checkout-safepay checkout-otp order-confirmation --project=store`
5. P1 gap closed — ready for P2

### Incremental Delivery

1. Setup + Foundation → helpers ready
2. P1 stories (3 files) → Safepay + OTP + Order Confirmation covered
3. P2 stories (4 files + 1 extension) → Returns + Analytics + Payments + Orders returns covered
4. P3 stories (4 files) → Sales + Settings + Inventory + Invoices covered
5. Polish → suite exits 0, `/sp.test-status` shows ✅ Approve

### Single-Developer Order

```
T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010
→ T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020
```

---

## Task Summary

| Phase | Tasks | Story | Priority |
|---|---|---|---|
| Phase 1: Setup | T001–T003 | Shared | — |
| Phase 2: Foundational | T004–T005 | Shared | — |
| Phase 3: Safepay | T006 | US1 | P1 |
| Phase 4: OTP | T007 | US2 | P1 |
| Phase 5: Order Confirmation | T008 | US3 | P1 |
| Phase 6: Returns | T009 | US4 | P2 |
| Phase 7: Analytics | T010 | US5 | P2 |
| Phase 8: Payments | T011 | US6 | P2 |
| Phase 9: Orders+Returns | T012 | US7 | P2 |
| Phase 10: Sales | T013 | US8 | P3 |
| Phase 11: Settings | T014 | US9 | P3 |
| Phase 12: Inventory | T015 | US10 | P3 |
| Phase 13: Invoices | T016 | US11 | P3 |
| Phase 14: Polish | T017–T020 | Shared | — |

**Total tasks: 20**  
**Spec files created: 10 new + 1 extended**  
**Journeys covered: 11 user stories → ~20 missing journeys closed**

---

## Notes

- `[P]` tasks = different files, no blocking dependencies — safe to parallelize
- Every data-dependent `test.skip()` MUST use a runtime condition: `test.skip(!data, 'no orders in DB')`
- Never use `page.waitForTimeout()` — use `page.waitForSelector()` or network wait
- Use locator priority: `getByRole` → `getByLabel`/`getByPlaceholder` → `getByText` → `data-testid`; never CSS class selectors
- Navigation assertions: `{ timeout: 8_000 }` minimum; network operations: `{ timeout: 15_000 }`
- Commit after each spec file is written and passes independently
- Stop at each Checkpoint to validate before proceeding
