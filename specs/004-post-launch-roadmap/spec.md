# Feature Specification: Post-Launch Roadmap (Deferred Features & Re-Entry Triggers)

**Feature Branch**: `004-post-launch-roadmap`
**Created**: 2026-07-05
**Status**: Draft
**Input**: User description: "Post-launch roadmap — deferred features tied to a merchant courier tracking endpoint and business maturity gates. We don't have a courier/logistics tracking API integration yet (evaluating Leopards Courier — no merchant account yet). Several features are explicitly deferred until specific real-world triggers occur, and must be documented with their re-entry condition rather than silently dropped, matching the project's existing pattern (see specs/003-merchandising-badges-v2 FR-016). 1. Real, professional PDF invoice via a React PDF-rendering library, replacing the current HTML-file email attachment — re-entry trigger: business maturity ("when store goes well"), independent of the courier tracking endpoint. 2. Automatic return/cancel eligibility rendering driven by real courier tracking data, replacing admin-manual order status as the source of truth for the 24h cancel window and 3-day post-delivery return window — re-entry trigger: a courier tracking number/API becomes available per order. 3. Automatic "delivered" status transition driven by real courier tracking data, firing the same cascade manual delivery-marking fires today (delivered_at, COD payment_status, invoice, customer email) — same re-entry trigger as item 2. 4. An in-admin-panel notification center consolidating every event that currently only reaches the merchant via email (new order, payment received, cancellation/return/exchange requests) — no external dependency. 5. A year-over-year revenue trend view in Admin Analytics comparing current-period revenue and repeat-customer rate against the same period the previous year — no external dependency."

## Background

This store currently has no courier/logistics tracking integration — order
delivery, cancellation eligibility, and return eligibility are all driven by
an admin manually clicking a status button (see `api/admin/orders/route.ts`,
and the cancel/return policy work in `api/requests/cancel/route.ts` and
`api/requests/return/route.ts`, which enforce a 24-hour cancel window off
`created_at` and a 3-day return window off `delivered_at`). That manual
process works today but has two real costs: the merchant must remember to
mark orders delivered, and email is the only channel that surfaces new
activity (orders, payments, cancellation/return/exchange requests) to the
merchant.

Five improvements were identified during recent work on this store but are
explicitly **not** being built now, each for a different reason — no courier
account yet, or a deliberate business-maturity gate. Per this project's
established convention (specs/003-merchandising-badges-v2, FR-016), deferred
capabilities must be documented with the concrete condition that would
justify revisiting them, rather than silently dropped or forgotten. This spec
exists to record that condition for each of the five, and to specify the two
that have no external dependency and could be picked up independently of the
courier integration.

## Clarifications

### Session 2026-07-08

- Q: US1's notification center was scoped to five event types including "new order placed" — but the admin already has a dedicated orders page and a dashboard KPI for new orders. Keep new-order as a sixth surface, or drop it from the notification center? → A: Drop it. The notification center covers only payment received, cancellation request, return request, and exchange request — the four events that currently have *no* in-admin surface other than email. New orders stay covered by the existing orders page + dashboard KPI, avoiding a duplicate signal.
- Q: US2's year-over-year comparison was scoped as one view combining revenue and repeat-customer rate. The Admin Analytics dashboard already separates concerns into tabs (Revenue, Performance, Products, Inventory, Orders), each with its own global 7d/30d/90d/12m range filter. Keep repeat-customer rate, or narrow to metrics that map onto existing tabs? → A: Narrow to two separate metrics, each living in the tab it already relates to: a revenue year-over-year comparison in the Revenue tab, and a sales/units-sold year-over-year comparison in the Performance tab. Repeat-customer rate is dropped from this spec's scope. Both comparisons must be additive to their tab — the existing range filter and current charts must not change behavior.
- Q: The store has no order history older than ~1 month (repo started 2026-06-07), so a true year-over-year comparison can't show real data yet. Build now or defer like US3/US4? → A: Build now, not defer. Each comparison collapses to a single "not enough history yet" line while under 12 months of data exists, and auto-expands into the full comparison once eligible — this avoids needing a second implementation pass later and keeps the re-entry-trigger pattern (FR-005 style) reserved for the genuinely dependency-blocked items (US3, US4).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Merchant sees payment and request activity in one place, without checking email (Priority: P1)

Today, the merchant only learns about a payment being received, or a
customer submitting a cancellation/return/exchange request, by checking an
external email inbox. A merchant who has the admin panel open should be
able to see all of that same activity inside the admin panel itself. New
orders are explicitly out of scope for this notification center — they
already have a dedicated orders page and a dashboard KPI, so surfacing them
a second time here would be a duplicate signal rather than new information.

**Why this priority**: No external dependency — buildable independently of
the courier integration, and directly addresses a real, present-day
friction point ("so I don't need to check email every time I opened admin
panel").

**Independent Test**: With the admin panel open, trigger each of the four
in-scope event types (payment received, cancellation request, return
request, exchange request) and confirm each appears in the notification
center without the merchant needing to open a separate email client, and
confirm placing a new order does NOT create a notification-center entry
(it remains visible only via the existing orders page/KPI).

**Acceptance Scenarios**:

1. **Given** a payment is confirmed (COD marked delivered, or an online payment webhook/verify fires), **When** the merchant views the notification center, **Then** a "payment received" notification appears with the order number.
2. **Given** a customer submits a cancellation, return, or exchange request, **When** the merchant views the notification center, **Then** a notification appears identifying the request type and order number.
3. **Given** the merchant has already reviewed a notification, **When** they return to the notification center later, **Then** previously-seen notifications are visually distinguished from new ones.
4. **Given** a customer places a new order, **When** the merchant views the notification center, **Then** no entry for it appears there (it remains covered exclusively by the existing orders page and dashboard KPI).

---

### User Story 2 - Merchant compares this year's performance to last year's (Priority: P2)

The Admin Analytics dashboard currently offers single-period views (7 days,
30 days, 90 days, 1 year) with no way to compare a period against the same
period a year prior. A merchant who has been operating long enough to have a
prior year of data should be able to see whether revenue (in the Revenue
tab) and sales volume (in the Performance tab) are improving year-over-year,
presented alongside the metric they already relate to rather than as a
separate report elsewhere in the dashboard.

**Why this priority**: No external dependency — buildable independently,
and the second-highest-value item with no blocker.

**Independent Test**: With at least one full year of order history, open
the Revenue tab and confirm it shows current-period vs. same-period-prior-
year revenue; separately open the Performance tab and confirm it shows the
equivalent year-over-year comparison for sales/units sold. With less than a
year of history (the current state), confirm both instead show a clear
"insufficient history" indicator that does not affect the rest of either
tab's existing content or the global range filter.

**Acceptance Scenarios**:

1. **Given** the store has order history spanning more than one year, **When** the merchant opens the Revenue tab, **Then** current-period revenue is shown alongside the same calendar period's revenue from the previous year.
2. **Given** the store has order history spanning more than one year, **When** the merchant opens the Performance tab, **Then** current-period sales/units sold is shown alongside the same calendar period's sales/units from the previous year.
3. **Given** the store does not yet have a full prior year of history (current state), **When** the merchant opens either the Revenue or Performance tab, **Then** the year-over-year comparison clearly indicates insufficient historical data rather than showing a misleading zero or blank comparison.
4. **Given** either year-over-year comparison is shown or collapsed, **When** the merchant uses the existing 7d/30d/90d/12m range filter or views any other chart on that tab, **Then** their behavior and output are unchanged from today.

---

### User Story 3 - Delivery and return/cancel eligibility update automatically from real courier data (Priority: P3, deferred)

Today the merchant manually clicks "Delivered" on an order, which is also
what starts the customer's 3-day return window and closes their 24-hour
cancel window. Once a real courier tracking integration exists, the order's
actual delivery event (reported by the courier) should drive this instead of
a manual click — both determining eligibility for the customer-facing
cancel/return policy and transitioning the order's own status — without the
merchant needing to do anything.

**Why this priority (and why deferred)**: **This is explicitly out of scope
to build now.** It requires a real courier tracking number/API per order,
which does not exist yet (a Leopards Courier merchant account has not been
opened). Building this now would mean guessing at an API shape with nothing
real to integrate against.

**Re-entry trigger**: A courier tracking number and tracking API become
available per order (e.g., a Leopards Courier merchant account is opened and
their booking/tracking API is wired into checkout and admin order
processing).

**Independent Test** (once the trigger condition is met): Place a real
order, have the courier's tracking data report it delivered, and confirm —
without any admin click — that the order transitions to delivered, the
existing delivery cascade fires (COD payment marked paid, invoice
settled/generated, customer "delivered" email sent), and the customer's
return-eligibility window is calculated from that real delivery event rather
than a manually-set timestamp. Separately, confirm a cancel request submitted
after the real courier tracking shows the order already shipped is correctly
rejected even if fewer than 24 hours have passed since placement.

**Acceptance Scenarios**:

1. **Given** a courier tracking integration exists and reports an order as delivered, **When** that event is received, **Then** the order's status, `delivered_at` timestamp, COD payment status, and invoice all update exactly as they do today when an admin manually marks the order delivered — with no admin action required.
2. **Given** a courier tracking integration exists, **When** a customer submits a return or cancel request, **Then** eligibility is determined from the courier-reported delivery/shipment event rather than from an admin-set status alone.
3. **Given** no courier tracking integration exists yet (current state), **When** this feature is not built, **Then** the existing manual-status workflow continues to function exactly as it does today — this item introduces no regression risk to the current flow.

---

### User Story 4 - Professional, branded PDF invoices (Priority: P4, deferred)

Customer-facing invoices are currently an HTML file attached to the payment
confirmation email. A dedicated, professionally formatted PDF (via a
React-based PDF rendering library) would look more polished for a more
established store.

**Why this priority (and why deferred)**: **This is explicitly out of scope
to build now.** It is gated on business maturity ("later when store goes
well"), not on any external integration — it is intentionally independent of
the courier-tracking trigger in User Story 3, and lower priority than either
of the two no-dependency items above.

**Re-entry trigger**: The merchant judges the store has reached a stage
where a more polished, professional invoice format is worth the added
dependency (a PDF-rendering library) and implementation effort — no
technical precondition, a business-judgment call.

**Independent Test** (once the trigger condition is met): Trigger a payment
confirmation email and confirm the attached invoice is a genuine PDF file,
opens correctly in standard PDF viewers, and matches the store's branding.

**Acceptance Scenarios**:

1. **Given** the business-maturity trigger has been judged met, **When** a customer's online payment is confirmed, **Then** the confirmation email attaches a real PDF invoice instead of the current HTML file.
2. **Given** this feature is not yet built (current state), **When** a payment is confirmed, **Then** the existing HTML invoice attachment continues to work exactly as it does today — this item introduces no regression risk to the current flow.

---

### Edge Cases

- What happens if the courier tracking integration (User Story 3's trigger) becomes available for *some* orders (e.g., only orders placed after a certain date) but not others? The automatic delivery/eligibility flow must coexist with the manual-status fallback for orders that predate the integration, rather than assuming universal courier coverage.
- What happens if a courier reports a delivery event that conflicts with an already-manually-set status (e.g., an admin already marked it delivered)? The system must not double-fire the delivery cascade (duplicate emails, duplicate invoice generation) — this mirrors the idempotency already required of the existing manual cascade.
- What happens to the notification center's badge/count if the merchant never opens it — does it grow unbounded? A read/unread or archival mechanism is needed so the center stays useful rather than becoming a wall of stale notifications.
- What happens to the year-over-year comparison for a store whose catalog, pricing, or sale strategy changed substantially between the two periods being compared? The view should present the raw comparison without implying it's an apples-to-apples like-for-like unless the merchant understands the underlying data changed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide an in-admin-panel notification center surfacing, at minimum, these four event types without requiring the merchant to check external email: payment received (COD delivered-triggered or online payment confirmed), cancellation request submitted, return request submitted, exchange request submitted. New order placement is explicitly excluded — it remains covered exclusively by the existing orders page and dashboard KPI.
- **FR-002**: The notification center MUST distinguish notifications the merchant has already seen from ones they haven't.
- **FR-002a**: The merchant MUST be able to archive (recoverable) or permanently delete individual notifications, so the center does not grow into an unbounded wall of stale entries (resolves the archival-mechanism edge case above). Deletion of a notification record MUST follow the same confirm-before-destructive-action convention already used elsewhere in admin (e.g. invoice/payment deletion).
- **FR-003**: The Admin Analytics Revenue tab MUST provide a year-over-year comparison showing current-period revenue alongside the same calendar period from the previous year.
- **FR-004**: The Admin Analytics Performance tab MUST provide a year-over-year comparison showing current-period sales/units sold alongside the same calendar period from the previous year.
- **FR-005**: Both year-over-year comparisons (FR-003, FR-004) MUST clearly indicate when insufficient historical data exists for a meaningful comparison, rather than silently showing a zero or misleading value.
- **FR-006**: Both year-over-year comparisons MUST be additive to their respective tab — they MUST NOT change the behavior or output of the existing 7-day/30-day/90-day/1-year range filter or any other chart currently on the Revenue or Performance tab.
- **FR-007**: The following capability is explicitly out of scope for this spec and MUST NOT be built now: automatic delivery-status transition and automatic return/cancel eligibility driven by real courier tracking data. Re-entry trigger: a courier tracking number and tracking API become available per order (e.g., a Leopards Courier merchant account is opened and integrated). Until that trigger is met, the existing admin-manual status workflow (and the 24-hour/3-day policy windows built on `created_at`/`delivered_at`) remains the source of truth and MUST NOT be weakened or removed in anticipation of this feature.
- **FR-008**: When the courier-tracking trigger (FR-007) is eventually met, the automatic delivery transition MUST fire the identical cascade the existing manual "mark delivered" action fires today: `delivered_at` stamping, COD `payment_status` auto-flip to paid, invoice generation/settlement, and the customer delivery-confirmation email — reusing that existing cascade logic rather than duplicating it.
- **FR-009**: The following capability is explicitly out of scope for this spec and MUST NOT be built now: replacing the current HTML-file email invoice attachment with a real PDF generated via a React PDF-rendering library. Re-entry trigger: the merchant judges the business has reached a maturity stage that justifies the added dependency and effort — a business decision, not a technical precondition. This item is independent of FR-007/FR-008's courier-tracking trigger.
- **FR-010**: Until the FR-009 trigger is met, the existing HTML-file invoice attachment on the payment-confirmation email MUST continue to function unchanged.

### Key Entities

- **Notification**: A record of a merchant-facing event (payment received, cancellation/return/exchange request — explicitly not new-order), including its type, related order number, timestamp, and seen/unseen state.
- **Courier Tracking Event**: A delivery/shipment status update reported by an external courier tracking API for a specific order — the future source of truth for automatic delivery transition and return/cancel eligibility (not yet integrated).
- **Year-over-Year Comparison Period**: A pair of matching calendar periods (current and prior year) used to compute and present a single metric side by side — revenue in the Revenue tab, sales/units sold in the Performance tab. Each is independent of the dashboard's global range filter.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A merchant with the admin panel open learns of a payment or cancellation/return/exchange request without needing to switch to an email client, verified across all four in-scope event types; new-order activity continues to be learned via the existing orders page/KPI, not duplicated here.
- **SC-002**: A merchant can determine, from the Revenue tab alone, whether current-period revenue is higher or lower than the same period the previous year, and separately, from the Performance tab alone, whether current-period sales/units sold is higher or lower than the same period the previous year — without manually cross-referencing external reports.
- **SC-003**: The two deferred capabilities (courier-driven automation; PDF invoicing) remain documented with their re-entry conditions and introduce zero behavior change to the current manual-status workflow or HTML invoice attachment until their respective triggers are met, verified by the existing cancel/return policy and invoice-email tests continuing to pass unmodified.
- **SC-004**: Once the courier-tracking trigger is met and User Story 3 is built, an order's delivery cascade (payment status, invoice, customer email) fires exactly once per real delivery event — zero duplicate cascades when a courier event and a lingering manual action could otherwise both fire it.
- **SC-005**: Before 12 months of order history exist (current state), the existing Revenue and Performance tab range filters (7d/30d/90d/12m) and all charts they currently drive produce identical output to today, verified by comparing tab output before and after the year-over-year widgets are added.
