# Feature Specification: Shipped Fixes Retrospective (Order/Sale/Admin Reliability)

**Feature Branch**: `005-shipped-fixes-retrospective`
**Created**: 2026-07-05
**Status**: Implemented (Retroactive)
**Input**: User description: "Retroactive SDD spec documenting ~12 already-shipped bug fixes and reliability improvements made on branch 003-merchandising-badges-v2 across COD dashboard KPIs, invoice generation and email attachment, analytics inventory/new-arrivals split, sale product-detail discount badge and cross-sale analytics contamination, sale/discount UI color, the sale filter routing bug, admin notification emails gaining SKU/customer identity, cancel/return/exchange policy enforcement with identity and time-window checks, a recurring unawaited-Supabase-query-builder silent-failure bug pattern, a recurring missing-force-dynamic stale-build-cache bug pattern, and the sales-analytics margin-preview-link visibility bug. Captures what these fixes now guarantee going forward as testable requirements, not just narration of the bug history, each traceable to its PHR under history/prompts/general/072 through 084."

## Background

This spec is retroactive — every requirement below describes a guarantee
that is **already implemented and verified**, not work to be planned. It
exists because a single long session produced roughly a dozen independent
bug fixes across order/sale/admin surfaces, each already recorded in its own
Prompt History Record (`history/prompts/general/072` through `084`), but
none previously captured as a testable spec that `/sp.analyze` or a future
regression pass can check the codebase against. Two of the fixes turned out
to be the same underlying bug *pattern* recurring in different files
(an unawaited Supabase write, and a missing dynamic-rendering directive) —
those are captured here as system-wide guarantees, not one-off patches, so a
future contributor introducing the same pattern elsewhere has something
concrete to be caught against.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Payment and invoice state is always accurate, and the merchant always has order identity in their notifications (Priority: P1)

A merchant reviewing an invoice, or reading a payment/return/exchange
notification email, must always see the real payment state and enough order
identity (order number, SKU, customer name and email) to act on it without
cross-referencing another system — never a hardcoded placeholder value and
never a notification missing the customer's contact details.

**Why this priority**: Directly affects money — a merchant who trusts a
"PAID" label that isn't real, or can't identify which customer a return
request belongs to, makes real business mistakes.

**Independent Test**: Print an invoice for an unpaid COD order and confirm
it shows "PENDING," not "PAID." Submit a return, exchange, and payment
event and confirm each resulting merchant email includes order number, SKU,
customer name, and customer email.

**Acceptance Scenarios**:

1. **Given** a COD order that has not yet been delivered, **When** its invoice is printed, **Then** the displayed status reflects the order's real `payment_status` (e.g. "PENDING"), never a hardcoded "PAID".
2. **Given** an online payment is confirmed via the Safepay webhook or the redirect-verify fallback, **When** the customer's confirmation email is sent, **Then** it attaches the invoice as a correctly-encoded file (not corrupted binary), and the merchant's "Payment Received" email includes the customer's email address and each ordered item's SKU.
3. **Given** a customer submits a return or exchange request, **When** the merchant's notification email is sent, **Then** it includes the order number, customer name, customer email, and each item's SKU.
4. **Given** an error occurs while building any of these email templates, **When** the send is attempted, **Then** the failure is logged (not silently dropped) so it is diagnosable.

---

### User Story 2 - Sale data is never contaminated across sales, and an expired sale never displays as active (Priority: P1)

A merchant managing multiple sales over time — including sales that reuse
the same product — must see accurate, per-sale analytics (never another
sale's orders bleeding into this one's numbers), must never see an expired
sale labeled "Running," and must always be able to open a sale's analytics
view regardless of whether it has any orders yet.

**Why this priority**: This is the second money-affecting category — wrong
sale analytics leads to wrong margin decisions, and a phantom "Running" sale
can mislead a merchant about what discount is actually live on the storefront.

**Independent Test**: Create two sales that both include the same product,
each with real orders in their own separate time windows; confirm each
sale's analytics attributes only its own window's orders. Let a sale's
`ends_at` pass; confirm it displays as inactive everywhere (storefront,
admin sales list, admin analytics) and that the underlying database row
itself updates, not just the page's read-time computation. Open analytics
for a sale with zero orders and confirm the link is reachable and shows a
margin-preview state.

**Acceptance Scenarios**:

1. **Given** a product is included in two different sales with non-overlapping active windows, **When** each sale's analytics are viewed, **Then** each sale shows only the revenue and order count from orders placed within its own window — never orders that belong to the other sale.
2. **Given** a sale's `ends_at` has passed, **When** any page determines whether it is active (storefront `/sale`, the shop's sale filter, the admin sales list, the admin dashboard, the per-sale analytics route), **Then** all of them agree it is inactive, and the sale's `is_active` database column itself is corrected to `false` (not just recomputed at read time).
3. **Given** a sale has zero orders, **When** the merchant opens its Analytics link from the sales list, **Then** the link is present and the page renders a margin-preview view (projected profit per unit) rather than being unreachable.
4. **Given** a related product is shown in a product detail page's "This Is For You" section and that product is on sale, **When** the section renders, **Then** it displays the discount badge with the correct sale price.
5. **Given** the admin sales list page or the admin product-edit page is loaded, **When** a sale or product has changed since the last deployment build, **Then** the page reflects the live, current database state — never a build-time snapshot.

---

### User Story 3 - Cancel, return, and exchange requests are policy-enforced and identity-verified (Priority: P1)

A customer requesting a cancellation, return, or exchange must have their
identity (name and email) verified against the order, and the request must
only be accepted within its policy window — 24 hours of placement for
cancellation, 3 days of actual delivery (not placement) for return/exchange
— with a clear, polite rejection otherwise.

**Why this priority**: Directly enforces real business policy that
previously had zero enforcement (cancellation) or the wrong basis (return
window measured from order date instead of delivery date).

**Independent Test**: Submit a cancellation for an order older than 24
hours and confirm rejection; submit one within the window with a
non-matching name/email and confirm rejection; submit one that matches and
is within the window and confirm acceptance. Repeat the equivalent flow for
return/exchange using the delivery-based window.

**Acceptance Scenarios**:

1. **Given** an order was placed more than 24 hours ago, **When** a cancellation request is submitted for it, **Then** it is rejected with a message explaining the 24-hour policy.
2. **Given** an order was delivered more than 3 days ago, **When** a return or exchange request is submitted for it, **Then** it is rejected with a message explaining the 3-day-from-delivery policy.
3. **Given** the name or email submitted with a cancellation/return/exchange request does not match the order's records, **When** the request is submitted, **Then** it is rejected regardless of timing, with a message asking the customer to double-check their details.
4. **Given** an order was delivered before the system began recording a delivery timestamp, **When** a return/exchange request is submitted for it, **Then** eligibility falls back to the prior 7-day-from-order-date policy rather than being unconditionally rejected for lack of data.
5. **Given** all checks pass, **When** a cancellation/return/exchange request is submitted, **Then** it is accepted and recorded.

---

### User Story 4 - Merchandising and dashboard surfaces show accurate, correctly-scoped, non-duplicated data (Priority: P2)

A merchant viewing the admin dashboard, analytics, or shop filters must see
KPIs and sections that reflect the current store configuration (e.g. COD
enabled/disabled), a defined and correct time window (not silently
unbounded), and no duplicated sections showing the same data twice.

**Why this priority**: Lower direct financial risk than User Stories 1–3,
but still misleads a merchant reading the dashboard, and the sale filter bug
directly blocked customers from browsing sale products at all.

**Independent Test**: Disable COD in settings and confirm the three
COD-specific dashboard KPIs disappear; re-enable and confirm they return.
Confirm the "Order Status Breakdown" donut only counts orders from the last
30 days. Confirm Analytics' Inventory tab shows a curated, flag-driven "New
Arrivals" section distinct from an age-based "Recently Added" section, and
that "Price Range Performance" appears exactly once (Performance tab, not
duplicated on the Products tab). Click "Sale" in the shop filters and
confirm real sale products are returned.

**Acceptance Scenarios**:

1. **Given** COD is disabled in store settings, **When** the admin dashboard is viewed, **Then** the COD Success Rate, Cash Collected (MTD), and COD In Transit KPIs are not shown; **when** COD is re-enabled, **Then** they reappear.
2. **Given** the admin dashboard's Order Status Breakdown donut, **When** it is viewed, **Then** it reflects only orders from the last 30 days, labeled as such.
3. **Given** the Analytics Inventory tab, **When** it is viewed, **Then** it shows a "New Arrivals" section driven by the product's manual new-arrival flag and window, separate from a "Recently Added to Inventory" section driven by catalog age — and the Products tab shows "Price Range Performance" nowhere (it exists only once, in the Performance tab).
4. **Given** a customer selects the "Sale" filter/tab on the shop page, **When** the results load, **Then** real products from the currently active sale are returned, each showing its correct discount badge — never an empty result.
5. **Given** the storefront navbar, **When** it is viewed, **Then** a "Home" link is present alongside the existing navigation items.

---

### User Story 5 - Product detail page displays accurate, non-duplicated information (Priority: P3)

A shopper viewing a product detail page must see the correct, non-duplicated
stock warning for their actual selected color/size combination, and section
headings must render as intended.

**Why this priority**: Cosmetic/UX correctness — does not block a purchase,
but a duplicated or misleading stock count undermines trust in the number
shown.

**Independent Test**: Open a product with tracked per-color/size stock;
confirm no "Only X left in stock" line appears until a full color/size
selection is made, and that it then shows the correct per-variant count
rather than repeating the page's overall stock count.

**Acceptance Scenarios**:

1. **Given** a product with per-variant stock tracking, **When** no color/size has been selected yet, **Then** no per-variant "Only X left in stock" line is shown (only the page-level overall-stock line, if applicable).
2. **Given** a full color/size selection has been made and that specific variant is low in stock, **When** the page re-renders, **Then** the per-variant stock line shows the correct count for that exact combination.
3. **Given** the "This Is For You" related-products section, **When** it is viewed, **Then** its heading is centered.

---

### Edge Cases

- A sale's revenue calculation must not silently include orders from before the sale existed or after it ended, even if a shared product spans multiple sales' lifetimes — every attribution is date-window-bounded, not just product-membership-bounded.
- A return/exchange request for an order with no recorded delivery timestamp (pre-migration order) must not be treated as "never eligible" — it uses the documented fallback window instead.
- A merchant who never resolves a cancellation/return/exchange request must still see it counted in the relevant admin tab indefinitely (no automatic expiry of the notification itself) — only explicit merchant action resolves it.
- An unawaited database write must never be the only mechanism relied upon for a state transition that another part of the system later assumes has already happened (e.g., analytics trusting `is_active`, or the return policy trusting `delivered_at`) — every such write in the fixed surfaces is now awaited.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Invoice display (print view and email) MUST reflect the order's actual `payment_status` rather than a hardcoded value.
- **FR-002**: Online-payment confirmation emails MUST attach the invoice as a correctly-encoded file that opens without corruption.
- **FR-003**: Merchant-facing notification emails for payment-received, return requests, and exchange requests MUST include the order number, customer name, customer email, and each ordered item's SKU.
- **FR-004**: Any error that occurs while constructing a notification email's content MUST be logged rather than silently discarded.
- **FR-005**: Any determination of whether a sale is currently active MUST account for both the `is_active` flag and the sale's `ends_at` timestamp — no surface may trust a possibly-stale `is_active` value alone.
- **FR-006**: Whenever a sale is found to be expired (`ends_at` has passed) but still flagged active, the system MUST correct the underlying `is_active` value in storage, not merely display it as inactive for that one read.
- **FR-007**: Per-sale revenue and order-count analytics MUST attribute an order to a sale only when the order's placement date falls within that specific sale's own active window, even when the order's product also belongs to a different sale.
- **FR-008**: The admin sales list MUST always provide access to a sale's analytics/margin-preview view, regardless of whether that sale has any orders yet.
- **FR-009**: A product shown as a "related product" (e.g. on another product's detail page) that is part of the currently active sale MUST display its discount badge and sale price.
- **FR-010**: Server-rendered admin pages that display live, frequently-changing data (sales list, product edit) MUST reflect the current database state on every request — never a build-time-frozen snapshot.
- **FR-011**: A cancellation request MUST be accepted only when the requester's name and email match the order's records AND the request is submitted within 24 hours of the order's placement.
- **FR-012**: A return or exchange request MUST be accepted only when the requester's name and email match the order's records AND the request is submitted within 3 days of the order's actual delivery.
- **FR-013**: When an order's delivery timestamp is unavailable (recorded before this capability existed), return/exchange eligibility MUST fall back to a 7-day-from-order-placement window rather than unconditionally rejecting the request.
- **FR-014**: The admin dashboard's COD-specific KPIs (Success Rate, Cash Collected MTD, COD In Transit) MUST be shown only when Cash on Delivery is enabled in store settings.
- **FR-015**: The admin dashboard's Order Status Breakdown MUST be scoped to a defined, labeled recent window (last 30 days) rather than being unbounded.
- **FR-016**: The Analytics Inventory tab MUST present the manually-flagged "New Arrivals" (subject to their configured active window) as a section distinct from catalog-age-based "recently added" inventory, and MUST NOT duplicate the "Price Range Performance" section across multiple tabs.
- **FR-017**: The shop page's "Sale" filter/tab MUST return the currently active sale's real products, never an empty result caused by matching against a non-existent category value.
- **FR-018**: The storefront navigation MUST include a direct link to the home page.
- **FR-019**: A product detail page's per-variant "Only X left in stock" indicator MUST NOT display until the shopper has made a complete color/size selection (for products that track variant-level stock), and MUST then reflect that specific variant's count rather than the product's overall stock count.

### Key Entities

- **Invoice**: A generated record (invoice number, amount, linked order) whose displayed payment status must always be derived from the order's current `payment_status`, never hardcoded.
- **Sale**: A time-bounded discount campaign (`starts_at`, `ends_at`, `is_active`) whose active state must be independently re-derivable from its own timestamps wherever it is checked, and whose analytics must attribute orders only within its own window.
- **Cancellation/Return/Exchange Request**: A customer-submitted request tied to an order, gated by an identity check (name + email match) and a time-window check (24h from placement for cancellation; 3 days from delivery, with a 7-day-from-placement fallback, for return/exchange).
- **Merchant Notification Email**: An email reaching the merchant for a business event (payment received, cancellation/return/exchange request), required to carry enough order/customer identity to act on without cross-referencing another system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero instances of an invoice or notification email showing incorrect, hardcoded, or missing payment/order/customer identity information, verified by live checks against real sent emails and printed invoices.
- **SC-002**: Zero instances of an expired sale (`ends_at` passed) displaying as active on any surface (storefront, shop filter, admin dashboard, admin sales list, per-sale analytics), verified against real production sale data.
- **SC-003**: Zero instances of a sale's analytics or revenue figures including an order that was placed outside that sale's own active window, verified against real orders spanning multiple sales that share a product.
- **SC-004**: 100% of cancellation/return/exchange requests are correctly accepted or rejected according to the identity-match and time-window rules, verified across at least one passing and one failing case for each rule.
- **SC-005**: The full automated end-to-end test suite passes with zero regressions attributable to these fixes, verified by a full suite run after the changes.
