# Feature Specification: E2E Test Suite — ZADIIS Store

| Field | Value |
|---|---|
| **Feature Name** | E2E Test Suite — Full Journey Coverage |
| **Feature ID** | 001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Priority** | P1 — Production gate |
| **Owner** | Aiman-17 |
| **Stakeholders** | Store Owner, Developer, QA |
| **Epic** | Quality Guardian / Testing Infrastructure |
| **Milestone** | Pre-launch production readiness |
| **Release Target** | Before first paid ad campaign |
| **Estimated Complexity** | Large (20 missing journeys, 10 active spec files + 3 deferred) |
| **Dependencies** | Playwright installed, `ADMIN_PASSWORD` env var, local dev server |
| **Related Features** | All store and admin features already implemented |
| **Created Date** | 2026-07-01 |
| **Branch** | `001-e2e-test-suite` |

---

## 2. Executive Summary

### Purpose
Establish a complete Playwright E2E test suite covering every critical customer and admin journey on the ZADIIS Pakistani women's fashion store. Tests validate the existing implementation — no new features are built.

### Business Objective
Every rupee spent on Instagram/Facebook ads drives cold traffic to this store. A broken checkout, failed payment, or inaccessible admin panel discovered in production costs real revenue and erodes brand trust. The test suite is the regression gate that prevents this.

### Proposed Solution
Write Playwright E2E tests for all 20 missing journeys (identified by `/sp.test-status`), organized into `tests/store/` and `tests/admin/`, following conventions already established in the existing 70 tests.

### Success Metrics
- All Stage 11 (admin) and Stage 12 (customer) journeys have at least one passing test
- `npm run test:e2e` exits 0 on a clean local environment
- P1 journeys (Safepay, OTP, Order Tracking) covered before first ad campaign launch

### Scope
**Active (10 spec files)** — pages confirmed implemented:
- **Store P1:** Safepay payment, Customer OTP auth, Order confirmation (`/order/[id]`)
- **Store P2:** Returns/cancellations (`/returns`, `/cancel-order`)
- **Admin P2:** Analytics, Payments (deep), Returns managed in Orders
- **Admin P3:** Inventory (in product edit), Sales/Discounts, Settings + Delivery Zones, Invoices

**Deferred — Not Yet Implemented (5 stories):**
- **Store P3:** Profile, Wishlist — pages do not exist yet; stories kept for future sprint
- **Admin P3:** Categories (`/admin/categories`), Customers (`/admin/customers`) — admin pages not built yet; stories kept for when features are implemented
- **Store/Admin P2:** Courier Shipment Tracking (Story 14) — courier service not yet decided (Leopards, PostEx, TCS candidates); spec this when service is chosen
- **Store P3:** Product Links in Transactional Emails (Story 15) — deferred alongside Story 14 as both touch email templates

### Out of Scope
- Writing new application features or fixing bugs
- Unit tests, API tests, visual regression, load testing
- CI/CD pipeline setup
- Modifying existing passing tests
- Deferred stories (Profile, Wishlist, Categories, Customers) — future sprint

---

## 3. Business Context

### Assumptions
- The existing application code is correct; tests validate it, not fix it
- `ADMIN_PASSWORD` is available via `.env.local`
- Supabase has test data (products, at least one order) for data-dependent tests
- Safepay sandbox credentials available in `.env.local` for payment tests

### Constraints
- Tests MUST NOT touch production Supabase data
- Tests MUST NOT send real emails or real payment charges (sandbox/mock at boundary only)
- All happy-path tests run against a real local server — no full network mocking

---

## 4. Stakeholders

| Stakeholder | Interest |
|---|---|
| Store Owner | Store works correctly before going live with ads |
| Developer (Aiman-17) | Clear test tasks, passing suite |
| Quality Guardian | All Stage 11–12 journeys gated |
| Customer (Guest) | Journey works end-to-end |
| Safepay (sandbox) | Payment redirect + webhook tested |

---

## Clarifications

### Session 2026-07-02

- Q: Stories 9 (Categories), 10 (Customers), and Store P3 (Profile, Wishlist) reference pages not yet implemented — remove or keep? → A: Keep in spec, mark as ⏸ DEFERRED — NOT YET IMPLEMENTED, preserve for future sprint when those features are built. Tests must not be written until pages exist.
- Q: Courier tracking number (e.g. Leopards, PostEx) and product links in emails are not implemented — add to spec? → A: Add as deferred Stories 14 and 15. Courier service not yet decided — Story 14 must not be detailed until service is chosen and their API/policy reviewed. Story 15 (email product links) deferred alongside Story 14 as both touch email templates.

---

## 5. User Stories

Stories ordered P1 → P2 → P3. Each maps to one new spec file (deferred stories noted inline).

---

### Story 1 — Safepay Card Payment Flow (P1)
**File:** `tests/store/checkout-safepay.spec.ts`

Customer selects card payment (Safepay), is redirected to Safepay's hosted page, completes sandbox payment, and lands on order confirmation with a valid ZD- order number.

**Acceptance Scenarios:**
1. **Given** cart has items + valid form, **When** Safepay selected and submitted, **Then** browser redirects to a Safepay-hosted URL
2. **Given** Safepay sandbox payment completes, **When** webhook fires, **Then** order exists with `payment_status = paid` and customer lands on `/order/[id]`
3. **Given** Safepay payment cancelled, **When** customer returns, **Then** order is NOT created and cart remains
4. **Given** invalid webhook payload, **When** received, **Then** order remains `pending`, no duplicate created

---

### Story 2 — Customer OTP Email Verification (P1)
**File:** `tests/store/checkout-otp.spec.ts`

At checkout submission, a 6-digit OTP is sent to the customer's email. Customer must enter it to place the order. Wrong or expired codes are rejected.

**Acceptance Scenarios:**
1. **Given** checkout form is valid, **When** "Place Order" clicked, **Then** OTP input modal appears
2. **Given** OTP modal open, **When** correct 6-digit code entered, **Then** order submitted → confirmation page
3. **Given** OTP modal open, **When** wrong code entered, **Then** error shown, order NOT submitted
4. **Given** OTP modal open, **When** "Resend OTP" clicked, **Then** new code sent, old invalidated
5. **Given** expired OTP (>10 min), **When** code entered, **Then** expiry error shown

---

### Story 3 — Order Confirmation Page (P1)
**File:** `tests/store/order-confirmation.spec.ts`

Customer lands on `/order/[id]` (UUID) after placing an order. Page shows order number (ZD-XXXX), customer name, items, payment method, and a WhatsApp contact link. No separate `/order-tracking` route exists — this page is the confirmation and status page.

**Acceptance Scenarios:**
1. **Given** COD order placed, **When** redirected to `/order/[id]`, **Then** order number ZD-XXXX and customer name visible
2. **Given** order confirmation page, **When** loaded, **Then** items, payment method (COD), and WhatsApp link present
3. **Given** Safepay order paid (webhook fired), **When** `/order/[id]` loaded, **Then** payment status shows paid
4. **Given** unknown UUID, **When** `/order/00000000-…` visited, **Then** not-found message shown

---

### Story 4 — Customer Returns & Cancellations (P2)
**File:** `tests/store/returns.spec.ts`

Customer initiates a return or cancellation from order tracking page.

**Acceptance Scenarios:**
1. **Given** delivered order, **When** return submitted with reason, **Then** return record created + confirmation shown
2. **Given** cancellable order, **When** cancelled with reason, **Then** order status → `cancelled`
3. **Given** order outside return window, **When** return attempted, **Then** request blocked with explanation

---

### Story 4b — Customer Profile (P3) ⏸ DEFERRED — NOT YET IMPLEMENTED
**File:** `tests/store/profile.spec.ts` *(not created — page not built)*

> **Status**: No `/profile` or `/account` page exists in the current store. Preserved for future sprint.

---

### Story 4c — Customer Wishlist (P3) ⏸ DEFERRED — NOT YET IMPLEMENTED
**File:** `tests/store/wishlist.spec.ts` *(not created — page not built)*

> **Status**: No `/wishlist` page exists in the current store. Preserved for future sprint.

---

### Story 5 — Admin Analytics Dashboard (P2)
**File:** `tests/admin/analytics.spec.ts`

Admin views 4-tab analytics: Overview, Revenue, Products, Customers. All render without errors.

**Acceptance Scenarios:**
1. **Given** admin logged in, **When** `/admin/analytics` visited, **Then** all 4 tabs render
2. **Given** Overview tab, **When** loaded, **Then** KPI cards (revenue, orders, AOV, customers) visible
3. **Given** Revenue tab, **When** date range changed, **Then** chart updates, no crash
4. **Given** Products tab, **When** loaded, **Then** top products table renders

---

### Story 6 — Admin Payments Deep Coverage (P2)
**File:** `tests/admin/payments.spec.ts`

Admin filters payments by status, views records, archives entries.

**Acceptance Scenarios:**
1. **Given** payments page, **When** "Paid" filter selected, **Then** only paid records shown
2. **Given** payments page, **When** record archived, **Then** moves to archived view
3. **Given** payments page, **When** loaded, **Then** 7-day sales trend chart renders

---

### Story 7 — Admin Returns & Exchanges Management (P2)
**File:** `tests/admin/orders.spec.ts` (extended — new describe block appended)

> **Research finding**: `/admin/returns` route does not exist. Return and exchange requests are managed within `/admin/orders`. Tests are added as an additional describe block in the existing `orders.spec.ts`.

Admin reviews return/exchange requests from within the Orders admin and updates their status.

**Acceptance Scenarios:**
1. **Given** pending return request in orders page, **When** admin approves, **Then** status → `approved`
2. **Given** pending exchange request, **When** admin rejects with reason, **Then** status → `rejected`
3. **Given** orders page returns section, **When** loaded, **Then** return requests visible with status badge

---

### Story 8 — Admin Inventory Management (P3)
**File:** `tests/admin/inventory.spec.ts`

Admin views and adjusts per-variant stock levels.

**Acceptance Scenarios:**
1. **Given** product edit page, **When** variants loaded, **Then** each size/color has a stock count
2. **Given** admin increases stock and saves, **When** page reloads, **Then** new count persisted
3. **Given** admin sets stock below 0, **When** saved, **Then** validation error shown

---

### Story 9 — Admin Categories Management (P3) ⏸ DEFERRED — NOT YET IMPLEMENTED
**File:** `tests/admin/categories.spec.ts` *(not created — page not built)*

> **Status**: `/admin/categories` admin page does not exist in the current codebase. This story is preserved for a future sprint when the categories feature is implemented. Tests MUST NOT be written until the page exists.

Admin creates, edits, and deletes product categories.

**Acceptance Scenarios (future):**
1. **Given** categories page, **When** new category created, **Then** appears in list
2. **Given** existing category, **When** name edited and saved, **Then** updated name shown
3. **Given** category with no products, **When** deleted, **Then** removed from list

---

### Story 10 — Admin Customers Page (P3) ⏸ DEFERRED — NOT YET IMPLEMENTED
**File:** `tests/admin/customers.spec.ts` *(not created — page not built)*

> **Status**: `/admin/customers` admin page does not exist in the current codebase. This story is preserved for a future sprint when the customers admin feature is implemented. Tests MUST NOT be written until the page exists.

Admin views customer list with order counts.

**Acceptance Scenarios (future):**
1. **Given** customers page, **When** loaded, **Then** rows with email + order count visible
2. **Given** customers page, **When** email searched, **Then** matching customers shown

---

### Story 11 — Admin Discounts & Sales (P3)
**File:** `tests/admin/sales.spec.ts`

Admin creates sale events that apply discounts to products.

**Acceptance Scenarios:**
1. **Given** sales page, **When** new sale created with %, dates, products, **Then** appears in active sales
2. **Given** active sale, **When** deactivated, **Then** discounted prices revert on store

---

### Story 12 — Admin Shipping / Delivery Zones (P3)
**File:** `tests/admin/settings.spec.ts` (merged into Story 13 — same page)

> **Research finding**: `/admin/shipping` route does not exist. Delivery zone city charges are configured within `/admin/settings`. Shipping tests are merged into Story 13's `settings.spec.ts`.

Admin configures city delivery charges reflected in checkout, accessed via `/admin/settings`.

**Acceptance Scenarios:**
1. **Given** settings page delivery zones section, **When** city charge updated + saved, **Then** charge persisted
2. **Given** free delivery threshold set, **When** order exceeds it, **Then** delivery charge = 0

---

### Story 13 — Admin Settings Page (P3)
**File:** `tests/admin/settings.spec.ts` (covers Story 12 delivery zones + Story 13 settings)

Admin views and saves store configuration including free delivery threshold and per-city delivery charges, all within `/admin/settings`.

**Acceptance Scenarios:**
1. **Given** settings page, **When** loaded, **Then** all configurable fields visible
2. **Given** free delivery threshold changed and saved, **When** page reloads, **Then** new value persisted
3. **Given** delivery zone city charges section, **When** city charge updated, **Then** charge saved correctly

---

### Story 14 — Courier Shipment Tracking (P2) ⏸ DEFERRED — SERVICE NOT YET DECIDED
**File:** `tests/store/order-tracking.spec.ts` + `tests/admin/orders-shipment.spec.ts` *(not created)*

> **Status**: No courier integration exists. The courier service has not been selected yet — candidates include Leopards, PostEx, TCS, and others. Each has different API contracts, tracking number formats, and webhook policies. This story MUST NOT be specced in detail until the service is chosen.
>
> **When ready to implement:** Run `/sp.specify courier-tracking` to write the full spec including API integration, `tracking_number` field in the `orders` table, display on `/order/[id]`, and admin booking flow.

**Known requirements (service-agnostic):**
- Orders table needs a `tracking_number` field (nullable until shipment booked)
- Admin marks order "shipped" → triggers courier booking → stores tracking number
- `/order/[id]` displays tracking number + link to courier tracking page when available
- Customer email on shipment should include tracking number + courier link

**Acceptance Scenarios (future — after service decision):**
1. **Given** order marked shipped, **When** courier API called, **Then** tracking number stored in order record
2. **Given** tracking number stored, **When** `/order/[id]` visited, **Then** tracking number and courier link visible
3. **Given** tracking number available, **When** shipment email sent, **Then** tracking number + link included

---

### Story 15 — Product Links in Transactional Emails (P3) ⏸ DEFERRED — NOT YET IMPLEMENTED
**File:** `tests/store/email-product-links.spec.ts` *(not created)*

> **Status**: Order confirmation emails and OTP emails do not currently include links back to the purchased product pages. This is a repurchase-flow enhancement. Deferred until courier tracking (Story 14) is resolved, as both touch the same email templates.

**Known requirements:**
- Order confirmation email should include each item name as a clickable link to `/shop/[slug]`
- No structural email changes needed — just link wrapping on existing product name text

**Acceptance Scenarios (future):**
1. **Given** order confirmation email sent, **When** viewed, **Then** each product name links to its store page
2. **Given** product link clicked from email, **When** page loads, **Then** correct product page shown

---

### Edge Cases

- OTP entered after 10-minute expiry → expiry error, not "wrong code"
- Safepay redirect with tampered query params → order not created
- Concurrent OTP submissions → only first accepted
- Order confirmation with unknown UUID → not-found message, no data exposure
- Return submitted after 7-day window → blocked with explanation
- Analytics with zero orders in range → empty state, no JS crash
- Inventory set to 0 → "Sold Out" on store front (regression check)
- Admin payments with no records → empty state, not error page

---

## 6. Functional Requirements

### Test Infrastructure
- **FR-001**: New spec files MUST follow `tests/<surface>/<journey>.spec.ts` naming
- **FR-002**: Admin tests MUST use `storageState: 'tests/.auth/admin.json'`
- **FR-003**: Store tests MUST NOT depend on auth state
- **FR-004**: Data-dependent tests MUST use `test.skip()` when required data absent
- **FR-005**: `page.waitForTimeout()` MUST NOT be used unless a comment explains why no alternative exists
- **FR-006**: Locator priority: `getByRole` → `getByLabel`/`getByPlaceholder` → `getByText` → `data-testid`; never CSS class selectors
- **FR-007**: Navigation assertions MUST use `{ timeout: 8_000 }` minimum
- **FR-008**: Network-dependent operations MUST use `{ timeout: 15_000 }`

### Store Tests
- **FR-010**: Safepay — redirect to Safepay URL on selection + submit
- **FR-011**: Safepay — order confirmation after sandbox payment success
- **FR-012**: Safepay — cancelled payment does NOT create order
- **FR-013**: OTP — modal appears after valid form submit
- **FR-014**: OTP — correct code allows order placement
- **FR-015**: OTP — wrong code shows error, blocks order
- **FR-016**: OTP — resend generates new code
- **FR-017**: Order confirmation — `/order/[id]` shows order number, name, items, payment method
- **FR-018**: Order confirmation — unknown UUID shows not-found message (no data leak)
- **FR-019**: Returns — return request submission flow
- **FR-020**: Returns — cancellation flow

### Admin Tests
- **FR-030**: Analytics — all 4 tabs render without errors
- **FR-031**: Analytics — KPI cards visible on Overview
- **FR-032**: Analytics — date range change does not crash charts
- **FR-033**: Payments — filter by status works
- **FR-034**: Payments — archive action works
- **FR-035**: Returns — status change for return/exchange requests
- **FR-036**: Inventory — variant stock levels shown per product
- **FR-037**: ⏸ DEFERRED — Categories create/edit/list (page not built; see Story 9)
- **FR-038**: ⏸ DEFERRED — Customers list with order data (page not built; see Story 10)
- **FR-039**: Discounts — sale creation and activation
- **FR-040**: Shipping — delivery zone city charges editable and saved in `/admin/settings` (checkout-side reflection deferred with Story 14 courier work)
- **FR-041**: Settings — page loads and saves

---

## 7. Non-Functional Requirements

| Requirement | Target |
|---|---|
| Full suite runtime | < 8 minutes locally |
| Store project runtime | < 3 minutes |
| Admin project runtime | < 5 minutes |
| Flakiness rate | < 5% |
| Test isolation | Each test runnable independently |
| Browser | Chromium only (this stage) |
| Environment | Must pass on Windows and Unix |

---

## 9. Business Rules Tests Must Validate

- **BR-001**: OTP expires after 10 minutes — expired code MUST be rejected
- **BR-002**: Safepay payment failure MUST NOT create an order record
- **BR-003**: Order tracking MUST NOT reveal another customer's order
- **BR-004**: Return window is 7 days from delivery; outside window MUST be blocked
- **BR-005**: Order in `shipped`/`delivered` MUST NOT offer cancellation
- **BR-006**: Inventory MUST NOT go below 0 via admin adjustment
- **BR-007**: Admin routes MUST redirect unauthenticated users to `/admin/login`
- **BR-008**: Duplicate Safepay webhooks MUST NOT create duplicate orders

---

## 11. State Transitions Tests Must Cover

**Order:** `new` → `processing` → `packed` → `shipped` → `delivered` → `completed`
Also: `new`/`processing` → `cancelled`; `delivered` → `returned`

**Return Request:** `pending` → `approved` → `completed`; `pending` → `rejected`

**Payment:** `pending` → `paid` (webhook); `pending` → `failed`; `paid` → `refunded`

---

## 12. Permissions Matrix

| Resource | Guest | Customer | Admin |
|---|---|---|---|
| Store pages | ✅ | ✅ | ✅ |
| Place order | ✅ | ✅ | — |
| Order tracking (by #) | ✅ | ✅ | — |
| Request return | ✅ | ✅ | — |
| `/admin/*` routes | ❌ redirect | ❌ redirect | ✅ |
| Manage orders/products | ❌ | ❌ | ✅ |
| Analytics/payments | ❌ | ❌ | ✅ |

---

## 13. Configuration

| Setting | Value | Source |
|---|---|---|
| `BASE_URL` | `http://localhost:3000` | env / config |
| `ADMIN_PASSWORD` | secret | `.env.local` |
| Auth state | `tests/.auth/admin.json` | `global.setup.ts` |
| Cart localStorage key | `zadiis_cart` | app constant |
| OTP expiry | 10 minutes | app business rule |
| Return window | 7 days from delivery | app business rule |
| Retries | 1 | `playwright.config.ts` |

---

## 19. Security Requirements for Tests

- **SEC-001**: All `/admin/*` routes MUST return redirect (not 200) when unauthenticated
- **SEC-002**: OTP endpoint MUST reject codes after expiry
- **SEC-003**: Order confirmation (`/order/[id]`) MUST return not-found for unknown UUIDs — no data exposure
- **SEC-004**: Safepay webhook MUST reject tampered payloads

---

## 27. Risks

| Risk | Mitigation |
|---|---|
| Safepay sandbox not configured | Skip with clear message if env vars absent |
| OTP email unverifiable locally | Mock at email boundary; validate modal + form flow |
| Test data (orders) absent | All data-dependent tests use `test.skip()` |
| Flaky timing on admin pages | Use `waitForSelector`, never `waitForTimeout` |
| Admin password not set | `global.setup.ts` throws clear error |

---

## 29. Acceptance Criteria

- **AC-001**: `npm run test:e2e:store` exits 0 (store journeys covered)
- **AC-002**: `npm run test:e2e:admin` exits 0 (admin journeys covered)
- **AC-003**: `/sp.test-status` reports ✅ for all Stage 11 and Stage 12 journeys whose pages exist (deferred journeys — Categories, Customers, Profile, Wishlist, Courier Tracking — report ⏸ Deferred, not ❌ Missing)
- **AC-004**: No permanent `test.skip()` — only data-dependent conditional skips
- **AC-005**: Each new spec file has ≥1 happy-path test and ≥1 negative-path test
- **AC-006**: P1 stories (Safepay, OTP, Order Confirmation `/order/[id]`) complete before first ad campaign

---

## 30. Definition of Done

- [ ] 10 active spec files created under `tests/store/` and `tests/admin/` (deferred stories 4b, 4c, 9, 10 excluded until pages built)
- [ ] All active FR-001 through FR-041 satisfied (FR-037, FR-038 deferred — excluded until their pages are built)
- [ ] All AC-001 through AC-006 pass
- [ ] `npm run test:e2e` exits 0 locally
- [ ] `/sp.test-status` shows no ❌ Missing journeys
- [ ] Zero application code modified — test files only
- [ ] PHR recorded
- [ ] Constitution Principle VII satisfied
