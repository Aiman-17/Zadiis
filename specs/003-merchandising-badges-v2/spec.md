# Feature Specification: Merchandising Badges v2 (Consistent, Category-Aware Product Rankings)

**Feature Branch**: `003-merchandising-badges-v2`
**Created**: 2026-07-03
**Status**: Draft
**Input**: User description: "merchandising-badges-v2 — Replace the four independently-duplicated best-seller/trending/just-dropped queries (ProductCard badge threshold, homepage section builder, Analytics chart filter, Shop tab filter) with one shared merchandising computation every page consumes. Best Seller and Trending become category-relative (compare a product against others in its own product_category, falling back to global comparison when uncategorized), fully automatic, with a low catalog-size-aware minimum sales threshold (2-3 units, not a fixed enterprise number) and a count that's min(cap, qualifying products) rather than a fixed top-8/top-10. Just Dropped switches from created_at to a real restock event, using the already-defined but currently-unused 'restock' reason in the stock_movements table. Remove the permanent is_bestseller/is_trending manual admin flags entirely and add a new manual Featured section as the marketing/merchant override outlet instead. New Arrival stays unchanged. Explicitly defer true per-collection leaderboards, season-over-season intelligence, a full automatic lifecycle state machine, and multi-arena ranking, each with an explicit re-entry trigger condition documented rather than silently dropped. Must render identical, consistent data across admin dashboard, admin analytics, storefront shop page, and homepage."

## Background

An audit of the live store found the same merchandising concepts — Best Seller,
Trending, Just Dropped — showing **different products, and different counts of
products, on different pages** for the same underlying data: 2 products badged
"Best Seller" on the Shop page, 4 on the Homepage, 5 flagged in Admin Analytics,
1 dominant result on the Admin Dashboard chart. Root cause: four separate parts
of the codebase each independently decide what counts as a "Best Seller" or
"Trending" product, using different thresholds, with no shared definition.

A second, related problem: the current Best Seller scoring rewards a product
that sold a single unit and sold out (100% of a tiny batch) over a product that
sold three times as many units but still has stock — because the scoring
formula does not distinguish "sold out because it's popular" from "sold out
because almost none were stocked." A live audit of the current 7-product
catalog confirmed this: a manually-designated best seller ranked below an
auto-scored product on this exact flaw, and only 2 of 7 products currently have
any product category assigned, meaning any category-based logic must handle
uncategorized products gracefully rather than excluding most of the catalog.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Every page shows the same merchandising badges (Priority: P1) 🎯 MVP

A shopper browsing the Shop page, the Homepage, and an admin reviewing the
Analytics dashboard should all see the same set of products labeled "Best
Seller" — not four different, disagreeing answers to the same question.

**Why this priority**: This is the actual defect the audit found and the
reason this feature exists. Every other story refines *how* the ranking is
calculated; this story fixes the fact that the same calculation isn't even
being consulted consistently today.

**Independent Test**: Load the Shop page, Homepage, and Admin Analytics
Products view at the same time; confirm the set of products carrying a "Best
Seller" badge/label is identical across all three (same products, same count).
Repeat for Trending and Just Dropped.

**Acceptance Scenarios**:

1. **Given** a product qualifies as a Best Seller, **When** it is viewed on the Shop page, the Homepage, and the Admin Analytics dashboard, **Then** it is labeled as a Best Seller in all three places, with no place showing it differently than another.
2. **Given** a product does not qualify as a Best Seller, **When** it is viewed anywhere in the store or admin, **Then** it is never labeled as a Best Seller anywhere.
3. **Given** the underlying sales data changes (a new order is placed), **When** any page is next viewed, **Then** all pages reflect the updated ranking consistently — no page is allowed to show stale results while another shows fresh ones.

---

### User Story 2 - Best Seller ranking reflects genuine repeat demand, fairly across categories (Priority: P2)

A merchandiser should be able to trust that "Best Seller" means customers are
consistently choosing this product over its alternatives — not that it
happened to be stocked in a tiny quantity and sold out. And a strong-selling
formal-wear item should be able to earn Best Seller status even if a
higher-volume casual category naturally sells more units overall.

**Why this priority**: Directly addresses the scoring flaw found in the audit
(a 1-unit sellout outranking a genuine 3-unit repeat seller) and the
structural bias where one high-volume category can crowd out every other
category from ever appearing.

**Independent Test**: With the current catalog's real sales data, confirm the
manually-recognized best-selling product (highest genuine repeat sales) ranks
at or above a product that merely sold out a very small batch. Confirm a
lower-volume category's top product can still qualify for Best Seller
consideration rather than being permanently crowded out by a higher-volume
category.

**Acceptance Scenarios**:

1. **Given** Product A sold 1 unit out of an original stock of 1, and Product B sold 3 units out of an original stock of 30, **When** Best Seller ranking is computed, **Then** Product B ranks above Product A.
2. **Given** a product has no category assigned, **When** Best Seller ranking is computed, **Then** it is still eligible for consideration, compared against the full catalog rather than being excluded.
3. **Given** a product has a category assigned, **When** Best Seller ranking is computed, **Then** its performance is evaluated relative to other products in the same category, not just against the entire catalog regardless of category.
4. **Given** the catalog currently has very few total sales per product, **When** the minimum-evidence threshold is applied, **Then** it is low enough that genuinely top-performing products (not every product) can still qualify — the threshold must not silently produce zero results on a small catalog.
5. **Given** more products qualify than the maximum display count, **When** Best Seller is shown, **Then** only the top-ranked ones up to that maximum are shown. **Given** fewer products qualify than the maximum display count, **When** Best Seller is shown, **Then** only the products that actually qualify are shown — the display never pads the list with non-qualifying products to hit a fixed count.

---

### User Story 3 - Trending reflects real, current momentum — not a permanent manual label (Priority: P2)

A shopper looking at "Trending" should see products with real, recent
momentum — and that set should be able to change as demand shifts, not stay
fixed on whatever a merchant manually flagged once and never revisited.

**Why this priority**: Directly addresses the "stays in a circle" problem —
today's Trending tab shows exactly one permanently-manually-flagged product
with no expiry, which doesn't match what "trending" is supposed to mean.

**Independent Test**: Confirm the set of Trending products is derived
entirely from recent sales activity (no manually-flagged product appears
unless it also has genuine recent momentum), and confirm that as sales
activity shifts over time, the Trending set can change without any admin
action.

**Acceptance Scenarios**:

1. **Given** a product has a genuine recent sales spike relative to its own prior pace, **When** Trending is computed, **Then** it appears in the Trending set.
2. **Given** a product's recent momentum fades (no longer selling faster than its baseline), **When** Trending is next recomputed, **Then** it is automatically removed from the Trending set without requiring any admin action.
3. **Given** two products in different categories with different typical sales paces, **When** Trending is computed, **Then** each is evaluated against a baseline appropriate to its own category, not a single store-wide pace that favors naturally higher-volume categories.
4. **Given** no product currently has genuine recent momentum, **When** Trending is displayed, **Then** the Trending section shows no products rather than forcing a manually-flagged product to appear.

---

### User Story 4 - Just Dropped reflects fresh inventory, not just new product listings (Priority: P2)

A shopper should see "Just Dropped" reflect products that genuinely have
fresh stock available — including a product that was created months ago but
just received new inventory — not only products whose catalog entry happens
to be recently created.

**Why this priority**: Matches the store's actual restocking pattern
(restocking existing products based on demand, not exclusively creating new
listings) and fixes a real gap where a meaningful restock of an established
product currently never appears as "Just Dropped" at all.

**Independent Test**: Restock an existing, previously-listed product (add
inventory to a product created long ago) and confirm it appears in Just
Dropped; confirm a brand-new product with fresh inventory also appears; confirm
a product with no recent restock and no recent creation does not appear
regardless of how it looks on the page.

**Acceptance Scenarios**:

1. **Given** a product that was created long ago receives new inventory today, **When** Just Dropped is computed, **Then** the product appears in Just Dropped.
2. **Given** a brand-new product is created with initial stock today, **When** Just Dropped is computed, **Then** it appears in Just Dropped (a first stocking counts as a restock event).
3. **Given** a product's most recent restock happened outside the freshness window, **When** Just Dropped is computed, **Then** it does not appear, regardless of when the product's catalog entry was originally created.
4. **Given** no product has been restocked within the freshness window, **When** Just Dropped is displayed, **Then** the section shows no products — it does not fall back to showing older or unrelated products to avoid appearing empty.

---

### User Story 5 - Merchants get a dedicated way to manually promote a product (Priority: P3)

A merchant who wants to manually highlight a product for a business reason
unrelated to sales data (a new exclusive design, a margin-driven push, a
collaboration) needs a way to do that without it being confused for a
customer-behavior signal like Best Seller or Trending.

**Why this priority**: This directly enables removing the old permanent
manual flags (User Story 6) by giving merchants an equivalent, better-scoped
tool first — sequencing matters, this must exist before the old flags are
removed.

**Independent Test**: Mark a product as Featured in the admin area and confirm
it appears in a distinct "Featured" section on the storefront, separate from
and not affecting the Best Seller or Trending calculations.

**Acceptance Scenarios**:

1. **Given** a merchant marks a product as Featured, **When** the storefront is viewed, **Then** the product appears in a Featured section, clearly distinct from Best Seller and Trending.
2. **Given** a product is marked Featured, **When** Best Seller or Trending are computed, **Then** the Featured status has no effect on either calculation.
3. **Given** a merchant wants a Featured placement to be temporary, **When** setting up the Featured status, **Then** an optional start/end window can be set, consistent with how New Arrival already supports optional dates.

---

### User Story 6 - Old permanent manual flags are retired (Priority: P3)

Once Featured exists as the proper outlet for manual promotion, the old
permanent "mark as Best Seller" / "mark as Trending" admin toggles should be
removed, so those two labels only ever reflect genuine, current customer
behavior.

**Why this priority**: Cleanup that depends on User Story 5 shipping first —
removing the old flags before Featured exists would leave merchants with no
manual promotion tool at all.

**Independent Test**: Confirm the admin product form no longer offers a way to
permanently mark a product as Best Seller or Trending, and confirm no
previously-flagged product continues to display either badge unless it also
genuinely qualifies under the automatic calculation.

**Acceptance Scenarios**:

1. **Given** the admin product form, **When** a merchant is editing a product, **Then** there is no control to permanently mark it as Best Seller or Trending.
2. **Given** a product was previously manually flagged as Best Seller or Trending before this change, **When** the system is updated, **Then** that product only continues to show either badge if it also genuinely qualifies under the automatic calculation — the old flag alone no longer causes a badge to display.

---

### Edge Cases

- What happens when the entire catalog has zero qualifying products for Best Seller or Trending (e.g., a brand-new store with no sales yet)? The section must show nothing rather than forcing low-quality or non-qualifying results to appear, and must not error or crash.
- What happens when a product's category is reassigned after it has already earned a category-relative ranking? Its ranking must be recalculated against its new category going forward, not remain compared against its old one.
- What happens when a product is deleted or deactivated while it holds a Best Seller, Trending, or Featured status? It must stop appearing anywhere immediately, not linger due to a stale cached result.
- What happens when a restock event and a sale happen for the same product on the same day? Just Dropped eligibility and Best Seller/Trending sales-based eligibility are independent calculations and must not interfere with each other.
- What happens when nearly the entire catalog qualifies for Best Seller at once (e.g., a very small catalog where most products have some sales)? The display cap must still apply — the qualifying rule and the display cap are two independent limits, both must be honored (only the top-ranked, capped subset of everything that qualifies is shown).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide exactly one computation for each of Best Seller, Trending, and Just Dropped status, consumed identically by every page that displays it (Shop, Homepage, Admin Dashboard, Admin Analytics) — no page may independently derive its own version of any of these three rankings.
- **FR-002**: Best Seller ranking MUST evaluate a product's performance relative to other products sharing its category when a category is assigned, and relative to the full catalog when no category is assigned.
- **FR-003**: Best Seller ranking MUST require a minimum amount of genuine sales evidence before a product can qualify, set low enough that a small catalog with modest sales volume can still produce qualifying results (not a threshold calibrated for a large, established catalog).
- **FR-004**: Best Seller ranking MUST NOT allow a product that sold a very small quantity and fully sold out to outrank a product with substantially higher genuine sales volume that still has remaining stock.
- **FR-005**: The number of products displayed as Best Sellers MUST be the lesser of a maximum display count and however many products actually qualify — never padded with non-qualifying products, and never silently capped when fewer products qualify than the maximum.
- **FR-006**: Trending status MUST be computed entirely automatically from recent sales momentum, with no manual override capable of adding a product that lacks genuine recent momentum.
- **FR-007**: Trending ranking MUST evaluate a product's recent momentum relative to a baseline appropriate to its own category when a category is assigned.
- **FR-008**: Trending status MUST be capable of changing automatically over time (products entering and leaving the Trending set) without requiring any admin action.
- **FR-009**: Just Dropped eligibility MUST be based on when a product most recently received new inventory (a restock event), not when its catalog listing was originally created.
- **FR-010**: A product's very first stocking (creation with initial inventory) MUST count as a restock event for Just Dropped purposes.
- **FR-011**: The system MUST provide a merchant-controlled "Featured" designation, independent of and with no effect on Best Seller or Trending calculations.
- **FR-012**: The Featured designation MUST support an optional start and end date, consistent with how New Arrival already supports optional date bounds.
- **FR-013**: The system MUST remove the ability to permanently, manually mark a product as Best Seller or Trending — a product may only carry either badge by genuinely qualifying under its automatic calculation.
- **FR-014**: New Arrival behavior (manual flag, optional start/end dates) MUST remain unchanged by this feature.
- **FR-015**: All rankings (Best Seller, Trending, Just Dropped) MUST update to reflect new data (new orders, new restocks, category reassignment) without requiring a manual recalculation step for every page to see the update, though a bounded delay for scheduled recalculation is acceptable.
- **FR-016**: The following capabilities are explicitly out of scope for this feature and MUST NOT be built now: per-collection leaderboards (separate rankings for named collections like "Eid Collection"), season-over-season historical comparison, a fully automatic product lifecycle state machine, and multi-dimensional ranking (a product simultaneously ranked within several different contexts such as category, price tier, and color). Each MUST be documented with the catalog condition that would justify revisiting it (e.g., collection leaderboards once a meaningful number of real, populated collections exist).

### Key Entities

- **Merchandising Ranking**: A computed result (Best Seller, Trending) for a product, including whether it currently qualifies, its rank within its comparison group (category or full catalog), and when it was last computed.
- **Restock Event**: A record of inventory being added to a product, including which product, when, and whether it was the product's initial stocking or a later replenishment — the basis for Just Dropped eligibility.
- **Featured Selection**: A merchant-controlled designation on a product, independent of sales data, with an optional active date range.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The set of products labeled Best Seller is identical across the Shop page, Homepage, and Admin Analytics view, checked at the same point in time — zero discrepancies.
- **SC-002**: The set of products labeled Trending is identical across every page that displays it, checked at the same point in time — zero discrepancies.
- **SC-003**: A product with meaningfully higher genuine sales volume never ranks below a product whose only advantage is a smaller original stock quantity, verified against real order history.
- **SC-004**: A merchant can restock an existing, previously-listed product and see it appear in Just Dropped within one scheduled recalculation cycle, without creating a new product listing.
- **SC-005**: Zero products display a Best Seller or Trending badge based solely on a manual flag with no genuine qualifying data behind it, verified after the old manual flags are removed.
- **SC-006**: When the qualifying-product count for Best Seller or Trending is below the maximum display count, the displayed count matches the qualifying count exactly (no padding); when above, the displayed count matches the maximum exactly (no unbounded lists).

## Assumptions

- Minimum sales evidence threshold for Best Seller starts at a low, catalog-size-aware value (informed by an audit showing the current catalog's highest seller has 3 total units sold) rather than a fixed number calibrated for a large catalog; exact tuning is a planning-stage decision, not a spec-level constraint.
- Maximum display counts for Best Seller and Trending start small (informed by the current 7-product catalog) and are expected to be revisited as the catalog grows — not fixed enterprise-scale numbers.
- Featured follows the same optional start/end date pattern already proven by New Arrival, rather than introducing a new date-handling pattern.
- Removing the `is_bestseller` / `is_trending` manual flags means removing the *admin control and the badge-driving effect* of those flags — whether the underlying data is deleted or simply stops being read is a planning-stage decision, not a spec-level constraint.
- The four deferred capabilities (collection leaderboards, seasonal intelligence, lifecycle state machine, multi-arena ranking) remain documented as explicitly deferred with re-entry conditions, so they are revisited deliberately rather than forgotten or rebuilt from scratch later.
