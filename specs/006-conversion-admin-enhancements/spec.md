# Feature Specification: Conversion & Admin Enhancements

**Feature Branch**: `006-conversion-admin-enhancements`
**Created**: 2026-07-08
**Status**: Draft
**Input**: User description: "A batch of storefront and admin enhancements: swipeable product gallery, color-to-image matching, admin-toggleable free delivery, promo popup cards, additional analytics visuals, badge lift/effectiveness analytics, slow mover logic consolidation, mobile long-press row actions, analytics tab renames, admin dark mode, and a manual cancellation toggle. Merchandising revenue click/view attribution is explicitly deferred."

## Background

This batch was identified across a series of post-launch working sessions on the ZADII'S store, alongside spec `004-post-launch-roadmap` (which covers the admin notification center, year-over-year analytics, and PDF invoicing). It groups eleven independently-testable improvements spanning the customer-facing storefront and the admin panel, plus one item that is explicitly deferred with a documented re-entry trigger, following this project's established convention (see `specs/003-merchandising-badges-v2` FR-016, `specs/004-post-launch-roadmap`).

Two pairs of items share a common pattern worth calling out: Free Delivery (US3) and Cancellations (US4) both introduce a merchant on/off business switch that also controls whether related policy information is shown to customers — deliberately consistent, so the merchant has one mental model for "toggle a policy off, and its promotion disappears too."

## Clarifications

### Session 2026-07-08 (carried forward from prior design discussion)

- Q: Should the free-delivery toggle, when disabled, hide the entire "Shipping Info" page link, or just the free-delivery-specific line within it? → A: Just the free-delivery-specific line (homepage trust bar + Shipping Info page). The Shipping Info link itself stays, since it also carries delivery-charge/zone information unrelated to the 5-item threshold.
- Q: Should the cancellation toggle, when disabled, only hide the footer link, or also block the cancellation form/API itself? → A: Both. Hiding only the link would still let a repeat customer who already knows the URL (bookmark, browser history) submit a cancellation, defeating the merchant's stated goal of using reduced visibility as a deliberate friction lever against a pattern where easy cancellation access correlates with higher cancellation rates.
- Q: Should admin dark mode apply to the whole panel (including Analytics charts) or just UI chrome? → A: The whole panel, including charts — a toggle that leaves charts light while everything else is dark would look broken, not intentional.
- Q: Scope of "additional analytics visuals"? → A: Two specific additions — a row-level product table in the existing Inventory tab, and dedicated sales charts for Featured and New-Arrival products in the existing Performance tab. Both are additive; no existing chart, table, or filter changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Customer browses product photos with a swipe (Priority: P1)

A customer viewing a product detail page on their phone wants to look through all of a product's photos the way they're used to on any modern shopping site — by swiping left/right with their thumb — instead of having to tap small thumbnail images one at a time.

**Why this priority**: Every product page view goes through this gallery; it's the highest-traffic surface in this entire batch and a well-established mobile shopping convention that's currently missing.

**Independent Test**: On a mobile viewport, open any product detail page with multiple images, swipe left and right on the main image, and confirm the active image changes accordingly; confirm arrow controls also work as an alternative on larger screens.

**Acceptance Scenarios**:

1. **Given** a product with 3+ images, **When** a customer swipes left on the main product image, **Then** the next image in the gallery becomes active.
2. **Given** a product with 3+ images, **When** a customer swipes right, **Then** the previous image becomes active.
3. **Given** the existing fullscreen zoom view, **When** a customer opens it, **Then** swipe navigation works there too, not just on the main gallery view.
4. **Given** a product with only 1 image, **When** a customer views it, **Then** no swipe/arrow controls are shown (nothing to navigate to).

---

### User Story 2 - Product photo matches the color a customer selects (Priority: P2)

A customer choosing between color options on a product detail page wants to see what the product actually looks like in the color they're considering, without having to guess from a single generic photo set.

**Why this priority**: Directly reduces purchase uncertainty at the exact moment of the color-selection decision — a common source of returns/dissatisfaction when the delivered color doesn't match customer expectation.

**Independent Test**: On a product with per-color tagged images, select each color swatch in turn and confirm the gallery's active image updates to match; select a color with no tagged image and confirm the gallery does nothing unexpected (no error, no blank state).

**Acceptance Scenarios**:

1. **Given** a product where at least one image is tagged with a color, **When** a customer selects that color swatch, **Then** the gallery's active image changes to the tagged image for that color.
2. **Given** a product where a selected color has no tagged image, **When** the customer selects that color, **Then** the gallery is unaffected — no error, no missing-image state.
3. **Given** a customer has selected a color and its matching image, **When** they continue browsing the gallery (swipe/click other thumbnails), **Then** all other images remain fully visible and browsable — the color match only affects which image starts active, it doesn't hide anything.
4. **Given** an admin uploading a new product image, **When** they optionally tag it with one of the product's existing colors, **Then** that tag is saved and immediately available for color-matching on the storefront.

---

### User Story 3 - Merchant turns free delivery off when business conditions change (Priority: P3)

The store currently always offers free delivery on orders of 5 or more items. If the merchant's cost structure or delivery capacity changes, they need a way to turn this off without a code change — and once it's off, customers shouldn't see promotional messaging for an offer that no longer applies.

**Why this priority**: A direct, reversible revenue/cost control lever the merchant currently has no way to operate themselves.

**Independent Test**: Toggle free delivery off in admin settings; place a 5+ item order and confirm delivery is charged; confirm the homepage and Shipping Info page no longer mention the offer. Toggle it back on and confirm everything reverts.

**Acceptance Scenarios**:

1. **Given** the free-delivery setting is enabled (current default behavior), **When** a customer's cart reaches 5+ items, **Then** delivery is free, exactly as today.
2. **Given** the merchant disables the free-delivery setting, **When** a customer's cart reaches 5+ items, **Then** delivery is charged normally — the 5-item threshold no longer waives the charge.
3. **Given** the free-delivery setting is disabled, **When** a customer views the homepage or the Shipping Info page, **Then** no free-delivery promotional copy is shown on either.
4. **Given** the merchant re-enables the setting, **When** a customer next views the homepage or Shipping Info page, **Then** the free-delivery messaging reappears and the checkout behavior is restored.

---

### User Story 4 - Merchant turns self-service cancellation off when needed (Priority: P3)

The store currently always allows customers to self-service cancel an order within 24 hours of placing it. The merchant needs the ability to turn this off entirely — for example, during a period where they want to reduce cancellation volume — without a code change, and without a customer being able to work around it by using a link or URL they already know from a previous order.

**Why this priority**: Same tier as free delivery — a direct, reversible business control lever with no current self-service path, addressing a real, named operational concern (cancellation-rate management).

**Independent Test**: Toggle cancellation off in admin settings; confirm the "Cancel an Order" footer link disappears; confirm navigating directly to the cancellation page or submitting the cancellation request via the API both show a clear "currently unavailable" message instead of processing the cancellation. Toggle back on and confirm the flow fully works again.

**Acceptance Scenarios**:

1. **Given** the cancellation setting is enabled (current default behavior), **When** a customer cancels within the existing 24-hour window, **Then** the cancellation is processed exactly as today.
2. **Given** the merchant disables the cancellation setting, **When** a customer looks at the site footer, **Then** the "Cancel an Order" link is no longer present.
3. **Given** the cancellation setting is disabled, **When** a customer nonetheless navigates directly to the cancellation page (e.g., via a bookmark from a prior order), **Then** they see a clear message that cancellations are currently unavailable, with an alternative way to reach the merchant — not a broken or silently-failing form.
4. **Given** the cancellation setting is disabled, **When** a cancellation request is submitted directly (bypassing the page), **Then** it is still rejected with the same unavailable message — the setting is enforced consistently, not just hidden from view.
5. **Given** the cancellation setting is disabled, **When** a customer looks at the Returns flow, **Then** it is completely unaffected — Returns is a separate, independent system not controlled by this setting.
6. **Given** the merchant re-enables the setting, **When** a customer next visits the site, **Then** the footer link reappears and the cancellation flow fully works again.

---

### User Story 5 - Customer notices an active promotion via an on-page card (Priority: P4)

A customer browsing the store — especially one who arrived from a paid ad and landed directly on a product page rather than the homepage — currently has no prominent way to learn about an active sale or the free-delivery threshold unless they happen to scroll past the relevant section.

**Why this priority**: Directly supports conversion and average-order-value (nudging toward the free-delivery threshold), but is lower priority than the control levers (US3/US4) and the core browsing improvements (US1/US2) since it's additive marketing, not a fix to an existing broken or missing capability.

**Independent Test**: With an active sale, load the homepage, a shop/category page, and a product detail page in a fresh session, and confirm a dismissible sale card appears once per session on each; dismiss it and confirm it doesn't reappear in the same session. Repeat for the free-delivery card when that setting is enabled.

**Acceptance Scenarios**:

1. **Given** an active sale exists, **When** a customer lands on the homepage, a shop/category page, or a product detail page for the first time in a session, **Then** a dismissible promotional card announcing the sale appears.
2. **Given** the free-delivery setting (US3) is enabled, **When** a customer lands on those same pages, **Then** a separate dismissible card announcing the free-delivery offer appears, visually distinct in tone from the sale card.
3. **Given** a customer has dismissed either card, **When** they continue browsing to other qualifying pages in the same session, **Then** that same card does not reappear.
4. **Given** no sale is currently active, **When** a customer browses the site, **Then** no sale card appears (nothing promotes an offer that doesn't exist).
5. **Given** the free-delivery setting (US3) is disabled, **When** a customer browses the site, **Then** no free-delivery card appears (consistent with US3's promotional-copy removal elsewhere).
6. **Given** a new browser session (or a cleared session), **When** the customer returns, **Then** previously-dismissed cards can appear again — the dismissal is per-session, not permanent.

---

### User Story 6 - Admin doesn't accidentally archive or delete something on mobile (Priority: P5)

An admin managing the store from a phone currently sees small delete/archive icon buttons packed tightly into narrow table rows across five different admin list pages (Products, Orders, Invoices, Payments, and the new Notifications center from spec 004). On a small screen, these are easy to tap by accident.

**Why this priority**: A real usability/safety issue on already-shipped admin tooling, but internal-facing and lower business impact than the customer-facing and revenue-control items above.

**Independent Test**: On a 375px-wide viewport, open each of the five admin list pages and confirm the destructive action icons are not visible by default; confirm a long-press on a row reveals them; confirm tapping a revealed icon still shows the same confirmation prompt as before. On a desktop-width viewport, confirm nothing changed — icons are visible and directly tappable as today.

**Acceptance Scenarios**:

1. **Given** an admin list page (Products, Orders, Invoices, Payments, or Notifications) viewed below the existing mobile breakpoint, **When** the page loads, **Then** the small archive/delete icons are not visible in the row by default.
2. **Given** that same mobile view, **When** an admin long-presses a row, **Then** the action icons for that row become visible.
3. **Given** a revealed action icon, **When** the admin taps it, **Then** the exact same confirmation behavior fires as it does today (a browser confirmation prompt for destructive actions, or an immediate action for reversible ones like Archive) — nothing about what the action *does* changes, only how it's reached on mobile.
4. **Given** the same admin pages viewed at desktop width, **When** the page loads, **Then** the icons are visible and directly clickable exactly as they are today — no change to desktop behavior.

---

### User Story 7 - Merchant sees more inventory and merchandising detail in Analytics (Priority: P6)

The Analytics dashboard's Inventory tab currently shows only summary cards and one chart, with no way to see individual product stock details in one place. Separately, the Performance tab has no way to see how Featured or New-Arrival products specifically are selling, even though those are merchant-curated categories the merchant actively manages.

**Why this priority**: Genuinely useful merchant insight, but purely additive reporting — no direct effect on revenue or customer experience, placing it below the customer- and control-facing items.

**Independent Test**: Open the Inventory tab and confirm a new row-level product table appears alongside the existing cards/chart, with no change to the existing content. Open the Performance tab and confirm new charts specifically for Featured and New-Arrival product sales appear alongside existing charts, unchanged.

**Acceptance Scenarios**:

1. **Given** the Inventory tab, **When** a merchant opens it, **Then** a new table listing individual products (stock level, SKU, value, low-stock indicator) appears in addition to the tab's existing cards and chart, which remain unchanged.
2. **Given** the Performance tab, **When** a merchant opens it, **Then** new charts showing sales for currently-Featured and currently-New-Arrival products appear in addition to the tab's existing content, which remains unchanged.
3. **Given** the merchant switches the dashboard's date-range filter (7 days / 30 days / 90 days / 12 months), **When** any existing chart or the new additions are viewed, **Then** every existing chart continues to behave exactly as before — these additions introduce no regression.

---

### User Story 8 - Merchant sees whether featuring a product actually helped sales (Priority: P7)

When the merchant marks a product as Featured or New Arrival, they currently have no way to tell whether that actually moved more units — they'd have to manually compare sales figures from before and after, which nobody does in practice.

**Why this priority**: Valuable but a "nice to know" rather than something acted upon daily — lower priority than the more actively-used reporting in US7.

**Independent Test**: Mark a product Featured, wait for some days of sales data both before and after that date, and confirm the Performance tab shows a before/after comparison for that product with a clear caveat that this is a correlation, not a controlled experiment.

**Acceptance Scenarios**:

1. **Given** a product that has been Featured or marked New Arrival, **When** the merchant views the relevant analytics section, **Then** they see a comparison of that product's sales velocity before and after the badge was applied.
2. **Given** a product with too little order history before or after its badge date to compute a meaningful comparison, **When** the merchant views this section, **Then** it clearly indicates insufficient data for that product rather than showing a misleading number.
3. **Given** any comparison shown, **When** the merchant reads it, **Then** it is accompanied by a clear statement that this reflects correlation with the badge date, not a controlled experiment — other factors could also explain a change.

---

### User Story 9 - "Slow Mover" is calculated the same way everywhere it appears (Priority: P8)

The "Slow Mover" designation currently appears in three different places in the admin panel (the product list, and two sales-creation screens), each with its own independent copy of the underlying calculation. If these ever drift apart, the same product could be labeled a slow mover in one place and not another, which would be confusing and erode trust in the label.

**Why this priority**: Pure internal consistency/maintainability — lowest priority since there is no current, observed bug; this closes off a *risk* rather than fixing a *known* problem.

**Independent Test**: Compare the set of products flagged as Slow Mover across the product list and both sales-creation screens before and after this change — the sets must be identical, since this is a consolidation, not a behavior change.

**Acceptance Scenarios**:

1. **Given** the Slow Mover designation as currently calculated, **When** this consolidation is complete, **Then** the exact same set of products is flagged as Slow Mover in the product list as before.
2. **Given** the same consolidation, **When** an admin opens either sales-creation screen, **Then** the exact same set of products is flagged as Slow Mover there too, matching the product list.

---

### User Story 10 - Analytics tab names describe what's actually in them (Priority: P9)

The Analytics dashboard's "Products" tab has grown to contain merchandising-focused content (Best Sellers, category performance, and — per US7/US8 — Featured/New-Arrival reporting), and its generic "Products" name no longer describes that focus. Similarly, "Performance" doesn't distinguish itself from the broader analytics the tab now contains.

**Why this priority**: Pure labeling clarity, no functional change — the lowest-impact item in this batch.

**Independent Test**: Open the Analytics dashboard and confirm the tab previously labeled "Products" now reads "Merchandising" and the tab previously labeled "Performance" now reads "Sales Performance" — with identical content and identical URL/filter behavior underneath both.

**Acceptance Scenarios**:

1. **Given** the Analytics dashboard, **When** a merchant looks at the tab strip, **Then** the tab that was labeled "Products" now reads "Merchandising."
2. **Given** the same dashboard, **When** a merchant looks at the tab strip, **Then** the tab that was labeled "Performance" now reads "Sales Performance."
3. **Given** either renamed tab, **When** a merchant clicks into it, **Then** its content, filters, and behavior are entirely unchanged — only the label is different.

---

### User Story 11 - Admin works comfortably in low light (Priority: P10)

An admin working in the evening or in a dim environment currently has no choice but the store's bright, cream-colored admin theme.

**Why this priority**: A comfort nicety with no effect on revenue, conversion, or data — the lowest-priority item that still delivers real, if small, value.

**Independent Test**: Toggle dark mode on from the admin sidebar, navigate across several admin pages including Analytics (with its charts), and confirm the entire panel — not just some pages — renders in a dark theme with charts remaining fully legible. Reload the browser and confirm the preference persisted.

**Acceptance Scenarios**:

1. **Given** an admin viewing any admin page, **When** they toggle dark mode on, **Then** the entire admin panel — navigation, tables, cards, and Analytics charts — switches to a dark theme, not just some of it.
2. **Given** dark mode is on, **When** the admin views any Analytics chart, **Then** it remains fully legible (adequate contrast, distinguishable series) — not simply the light-mode chart placed on a dark background.
3. **Given** dark mode is toggled on, **When** the admin closes and reopens the browser, **Then** dark mode is still on — the preference persists across sessions.
4. **Given** dark mode is on, **When** the admin toggles it back off, **Then** the panel returns fully to the current light theme.

---

### User Story 12 - Merchandising revenue attribution (Priority: Deferred, not built)

The merchant may eventually want to know not just whether a Featured/New-Arrival product sold more (US8), but whether customers actually *saw or clicked into* the merchandised section that led them there — true placement-effectiveness attribution, not just a sales-date correlation.

**Why this priority (and why deferred)**: **This is explicitly out of scope to build now.** No click/view tracking of any kind currently exists anywhere on the storefront. Building it requires new data-collection infrastructure (an events table and storefront instrumentation) — a materially larger and separate undertaking from everything else in this batch, which is otherwise all built from data the store already has.

**Re-entry trigger**: The merchant finds US8's sales-date correlation insufficient and specifically wants to know whether customers are seeing/clicking into the Featured/New-Arrivals sections at all, not just whether sales moved afterward.

**Acceptance Scenarios**:

1. **Given** this capability is not built, **When** the merchant uses US8's badge-lift comparison, **Then** that comparison continues to work exactly as specified there — this deferred item introduces no regression to US8.

---

## Edge Cases

- What happens if a product has color swatches (US2) but the admin never tagged any image with a color? The gallery must behave exactly as it does today — full browsability, no error, no assumption that a match should exist.
- What happens if a customer has the free-delivery promo card (US5) open and the merchant disables free delivery (US3) in the same moment? The customer's current session may briefly show a stale card; this is acceptable since the underlying checkout logic (the actual charge) is authoritative and re-checked at checkout regardless of what any promotional card said.
- What happens to an in-progress cancellation request if the merchant disables cancellations (US4) partway through? The customer's already-submitted request should still be visible to the merchant for manual handling — disabling the setting only prevents *new* submissions, it doesn't erase or hide existing pending requests.
- What happens if an admin's long-press (US6) is interrupted (e.g., they scroll mid-press) on a touch device? The action icons must not fire unintentionally — only a completed long-press on a stationary row reveals them, and only an explicit subsequent tap on a revealed icon triggers anything.
- What happens to the badge-lift comparison (US8) if a Featured product's price changed between its "before" and "after" windows? The comparison is explicitly labeled as correlational (see US8's acceptance scenario 3) precisely to cover this and similar confounds — it is not expected to control for them.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product detail page image gallery MUST support touch-swipe navigation between images, in both the main view and the fullscreen zoom view, in addition to any existing navigation method.
- **FR-002**: Admins MUST be able to optionally tag an uploaded product image with one of that product's existing colors. Selecting that color on the storefront MUST bring the tagged image to the front of an otherwise fully unchanged, fully browsable gallery.
- **FR-003**: The system MUST provide a merchant-controlled setting that, when disabled, stops offering free delivery on 5+ item orders and removes all customer-facing promotional copy about that offer, while leaving unrelated delivery/shipping information untouched.
- **FR-004**: The system MUST provide a merchant-controlled setting that, when disabled, both hides the cancellation entry point from customers and rejects any cancellation attempt (direct page visit or direct API submission) with a clear unavailable message — not just a hidden link with a still-functioning form underneath. This setting MUST NOT affect the Returns flow, which is a separate system.
- **FR-005**: The system MUST show a dismissible promotional card for an active sale, and a separate dismissible card for the free-delivery offer (when enabled), on the homepage, shop/category pages, and product detail pages — each shown at most once per browsing session, visually distinguishable from one another.
- **FR-006**: On the admin Products, Orders, Invoices, Payments, and Notifications list pages, destructive/archival row actions MUST be hidden by default below the existing mobile breakpoint, revealed via a long-press on the row, and MUST still require the same confirmation behavior they require today once revealed. Desktop-width behavior MUST be unchanged.
- **FR-007**: The Analytics Inventory tab MUST show a row-level product table (stock, SKU, value, low-stock indicator) in addition to its existing content. The Analytics Performance tab MUST show sales charts specifically for currently-Featured and currently-New-Arrival products in addition to its existing content. Neither addition may alter the existing behavior of either tab or the dashboard's global date-range filter.
- **FR-008**: The system MUST provide a sales-velocity before/after comparison for Featured and New-Arrival products, relative to their badge start date, clearly labeled as a correlational signal rather than a controlled experiment, and MUST indicate when insufficient data exists for a given product rather than showing a misleading result.
- **FR-009**: The "Slow Mover" designation MUST be calculated by a single, shared piece of logic used everywhere it currently appears (product list, both sales-creation screens), such that the same set of products is flagged consistently in every location.
- **FR-010**: The Analytics dashboard's "Products" tab MUST be relabeled "Merchandising" and its "Performance" tab MUST be relabeled "Sales Performance," with no change to either tab's underlying content, filtering, or behavior.
- **FR-011**: The admin panel MUST offer a dark-mode toggle that applies to the entire panel, including Analytics charts (which must remain fully legible in dark mode, not simply light-mode charts on a dark background), and MUST persist the merchant's preference across sessions.
- **FR-012**: The following capability is explicitly out of scope for this spec and MUST NOT be built now: tracking whether customers see or click into Featured/New-Arrival merchandised sections (as opposed to just whether they subsequently purchased). Re-entry trigger: the merchant finds User Story 8's sales-date correlation insufficient and specifically wants to know about section visibility/engagement, not just sales outcomes.

### Key Entities

- **Product Image Color Tag**: An optional color association on an individual product image, used to select which image comes to the front of the gallery when a matching color is selected on the storefront.
- **Free Delivery Setting**: A merchant-controlled on/off switch governing whether the 5+ item free-delivery offer is active and advertised.
- **Cancellation Setting**: A merchant-controlled on/off switch governing whether customers can self-service submit a cancellation request, independent of the Returns system.
- **Promotional Card**: A dismissible, session-scoped on-page announcement of an active sale or the free-delivery offer.
- **Badge Lift Comparison**: A derived, per-product comparison of sales velocity before and after a Featured or New-Arrival badge was applied, with an explicit correlation-not-causation caveat.
- **Admin Theme Preference**: A persisted merchant preference (light/dark) applied across the entire admin panel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Customers can navigate a product's full photo set on mobile using touch gestures alone, without needing to tap individual thumbnails, verified across products with varying image counts.
- **SC-002**: When a product has color-tagged images, selecting a color swatch shows the matching image within the same interaction, with zero additional page loads or visible delay.
- **SC-003**: The merchant can turn free delivery or self-service cancellation off, and confirm within one page load that all customer-facing promotion of the disabled capability is gone — no stale promotional copy anywhere on the site.
- **SC-004**: A disabled cancellation setting cannot be circumvented by a customer who already knows the cancellation page URL — verified by direct navigation and direct API submission both being rejected.
- **SC-005**: On a 375px-wide screen, no admin can accidentally trigger a destructive action (archive/delete) with a single accidental tap on any of the five affected admin list pages — a long-press is required to even reveal the option.
- **SC-006**: Every new Analytics addition in this batch (inventory table, Featured/New-Arrival charts, badge-lift comparison) coexists with the existing dashboard such that switching the global date-range filter produces byte-identical output on every pre-existing chart, before and after this feature ships.
- **SC-007**: The Slow Mover designation is 100% consistent across all three admin surfaces that show it, verified by comparing the flagged product set at each location.
- **SC-008**: Admin dark mode, once enabled, remains legible and fully applied (no light-themed elements remaining) across 100% of admin pages, including every Analytics chart type.

## Assumptions

- "Mobile breakpoint" throughout this spec refers to the admin panel's existing responsive breakpoint (already used to collapse the sidebar into a hamburger menu), not a new breakpoint being introduced.
- The five admin surfaces named in US6 (Products, Orders, Invoices, Payments, Notifications) are the complete current set of admin list pages with per-row destructive icon actions; if additional such surfaces are discovered during implementation, they should be added to keep the mobile-safety guarantee (SC-005) complete rather than silently left out.
- "Session" for the promotional cards (US5) and the notification-adjacent patterns elsewhere in this codebase means a single browser session (cleared on browser/tab close or explicit clearing), not a login session — consistent with how session-scoped behavior already works elsewhere in this codebase.
- Badge-lift comparisons (US8) default to a 7-day before/after window given the store's current ~1 month of total order history; this window is an implementation detail to be finalized during planning, not a business requirement fixed by this spec.
