# Phase 0 Research: Merchandising Badges v2

## 1. How to make Best Seller/Trending "category-relative" without building per-collection leaderboards (FR-002, FR-007, FR-016)

**Decision**: Normalize each categorized product's score to a 0–1 scale relative
to the strongest performer in its own `product_category`
(`relative_score = raw_score / max(raw_score among same-category products)`),
then rank *all* products — categorized and uncategorized — together in one
merged list using that normalized value. Uncategorized products use their raw
score directly (no normalization group to compare against), consistent with
spec's "falling back to global comparison when uncategorized."

**Rationale**: This is the smallest change that satisfies US2 without building
the separately-deferred "true per-collection leaderboards" (FR-016) — there is
still exactly one Best Seller list and one Trending list, each page still
calls one function, but a strong performer in a low-volume category can now
reach the top of that single list instead of being permanently buried under a
high-volume category's leaders. A category with only one member normalizes
that member to 1.0 automatically (it's the best of one), which is correct: a
lone formal-wear product that's selling at all should be able to compete for
the list.

**Alternatives considered**:
- *Separate top-N per category, concatenated* — this is what FR-016 explicitly
  excludes ("per-collection leaderboards"); rejected as out of scope.
- *Z-score (standard deviations from category mean)* — statistically more
  rigorous, but meaningless with 1–2 products per category (no usable
  variance) on the current catalog; revisit once categories have enough
  members for variance to mean anything.
- *Global raw score only (current behavior)* — this is the bug being fixed;
  rejected.

## 2. Anti-sellout-gaming fix for Best Seller (FR-004, US2 Scenario 1)

**Decision**: Introduce a minimum sales-evidence floor — a product must have
`total_sold >= MIN_SALES_FOR_BESTSELLER` before it can qualify for Best Seller
consideration at all, applied *before* scoring/ranking, not as a scoring
factor. Starting value: **2 units**.

**Rationale**: Verified against live data — current catalog's highest seller
is 3 units (Elegant Dress); the product that currently outranks it on the
existing sell-through-heavy formula sold exactly 1 unit and sold out. A floor
of 2 excludes single-unit sellouts entirely (the exact scenario the audit
found) while still being low enough that Elegant Dress (3 units) qualifies.
This directly satisfies US2 Scenario 1 by disqualifying the 1-unit product
rather than merely re-ranking it below the 3-unit one — a cleaner fix than
tuning formula weights.

**Alternatives considered**:
- *5–10 units (per the second external proposal reviewed with the user)* —
  rejected: would currently produce zero qualifying Best Sellers against real
  data, contradicting FR-005's "never silently zero on a small catalog" intent.
- *Weight-based softening (reduce sell-through's influence instead of a hard
  floor)* — more complex to reason about and tune; a hard floor is simpler to
  explain to a non-technical store owner and directly testable.

## 3. Display cap for Best Seller / Trending (FR-005)

**Decision**: Starting cap = **4** for both Best Seller and Trending.

**Rationale**: Matches the existing homepage section size already used
throughout `src/lib/products.ts` (`getBestsellerProducts(4)`,
`getTrendingProducts(4)`) — no visual/layout change required on the homepage.
Reasonable for a 7-product catalog. `count = min(cap, qualifying products)`
per FR-005 — with the 2-unit floor above, only 1 product (Elegant Dress)
currently qualifies for Best Seller, so the section will correctly show 1
product, not 4 padded slots.

**Alternatives considered**: *8–10 (per the second external proposal)* —
rejected as unreachable and meaningless with a 7-product catalog; documented
in spec.md Assumptions as a value to revisit as the catalog grows.

## 4. Restock event detection (FR-009, FR-010)

**Decision**: Reuse the existing stock-comparison hook already present in
`PUT /api/admin/products` (`store/src/app/api/admin/products/route.ts:43-64`),
which already reads the product's *old* `stock_quantity` before applying an
update (currently used only to detect a 0→positive transition for back-in-
-stock waitlist emails). Broaden the condition from "old was exactly 0 and new
is positive" to **"new stock_quantity > old stock_quantity"**, and on that
condition, insert a `stock_movements` row with `reason: 'restock'` (a value
the schema already defines in `supabase/stock-ledger.sql` but no code path
has ever written). The back-in-stock email trigger keeps its narrower 0→
positive condition unchanged — that is a different concern (notifying
waitlisted customers) from Just Dropped eligibility (surfacing fresh
inventory generally).

For product *creation* (FR-010 — first stocking counts as a restock event):
insert a `stock_movements` row with `reason: 'restock'` from
`POST /api/admin/products` when the new product's initial `stock_quantity` is
greater than 0.

**Rationale**: No new database table or column required — the schema already
supports this, it has simply never been populated. Reuses an existing,
already-correct "read old value before update" pattern rather than inventing
a new one.

**Alternatives considered**: *New `last_restocked_at` timestamp column
directly on `products`* — simpler to query (no join needed) but duplicates
information the `stock_movements` ledger already exists to hold, and loses
restock *history* (only the most recent event) which the ledger preserves for
free. Revisit only if query performance on the ledger join becomes a measured
problem — not expected at current catalog size.

## 5. Just Dropped freshness window (FR-009)

**Decision**: Keep the existing 72-hour window unchanged — only the timestamp
source changes (most recent `stock_movements` row with `reason='restock'` for
the product, instead of the product's `created_at`).

**Rationale**: Spec's Assumptions section only asks to fix *what event*
starts the clock, not the window length itself; changing two variables at
once would make it harder to isolate which change caused what effect.
Revisit window length only if real usage data suggests 72 hours doesn't match
the store's actual 7–15 day restock cadence well enough — noted as a
candidate follow-up, not required now.

## 6. Removing `is_bestseller` / `is_trending` (FR-013)

**Decision**: Remove the admin UI toggle (badge buttons in the product
new/edit forms) and stop reading these columns anywhere in badge/ranking
logic. Leave the underlying database columns in place (do not drop them) —
they become inert, unread data rather than requiring a migration to delete.

**Rationale**: Per spec.md's Assumptions, this is explicitly left as a
planning-stage choice. Not dropping the columns avoids a destructive schema
migration for a cosmetic cleanup; if a future audit wants to fully remove
them once confirmed unused, that's a trivial follow-up migration with no
functional risk, since nothing will be reading them after this feature ships.

## 7. Featured selection storage (FR-011, FR-012)

**Decision**: Add three new columns to `products`: `is_featured boolean`,
`featured_start timestamptz`, `featured_end timestamptz` — directly mirroring
the existing `is_new_arrival` / `new_arrival_start` / `new_arrival_end`
pattern already proven in the schema and already handled by existing
date-window query logic in `src/lib/products.ts`.

**Rationale**: Reuses a pattern that already works and is already understood
by whoever maintains this codebase, rather than inventing a new date-handling
convention for one more feature.
