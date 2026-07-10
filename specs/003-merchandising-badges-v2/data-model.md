# Phase 1 Data Model: Merchandising Badges v2

## Schema changes

### `products` table — new columns

| Column | Type | Default | Purpose |
|---|---|---|---|
| `is_featured` | boolean | `false` | Merchant-controlled Featured designation (US5, FR-011) |
| `featured_start` | timestamptz | `null` | Optional start of Featured window (FR-012) — `null` = active immediately once `is_featured` is true |
| `featured_end` | timestamptz | `null` | Optional end of Featured window (FR-012) — `null` = no expiry |

Mirrors the existing `is_new_arrival` / `new_arrival_start` / `new_arrival_end`
columns exactly (same nullable-bounds pattern, same query logic shape already
proven in `getNewArrivalProducts()`).

### `products` table — existing columns, behavior change only (no schema change)

| Column | Old meaning | New meaning |
|---|---|---|
| `is_bestseller` | Permanent manual "mark as Best Seller" (read by ProductCard fallback, Analytics chart, homepage fallback) | Unread by any badge/ranking logic after this feature ships (FR-013). Column retained, not dropped (research.md #6). |
| `is_trending` | Permanent manual "mark as Trending" (the only thing driving the Shop page's Trending tab today) | Unread by any badge/ranking logic after this feature ships (FR-013). Column retained, not dropped. |
| `best_seller_score`, `trending_score` | Computed nightly + on-order, but consumed inconsistently by 4 different threshold rules | Same computation trigger (unchanged), but now the *only* signal for Best Seller/Trending — consumed through one shared function (FR-001) with category-relative normalization applied at read time (research.md #1), not stored as a second "normalized" column (avoids the normalization going stale relative to a category's current membership). |

### `stock_movements` table — no schema change, new usage

The `reason` column already has a `CHECK (reason IN ('sale', 'restock',
'return', 'adjustment'))` constraint (`supabase/stock-ledger.sql`) — `restock`
has never been inserted by any code path until this feature. No migration
needed; only new `INSERT` call sites (research.md #4).

## Key Entities (from spec.md, mapped to storage)

### Merchandising Ranking (computed, not stored as its own row)

Not a new table — a *computed result* produced by the one shared function per
FR-001, read from existing `products.best_seller_score` /
`products.trending_score` plus each product's `product_category` for
normalization (research.md #1). No new entity needed because nothing about
"is this product currently a Best Seller" needs to persist between requests —
it's cheap to compute from already-stored scores at read time, and computing
it fresh avoids a second place for staleness to creep in.

### Restock Event

Existing `stock_movements` row, `reason = 'restock'`:

| Field | Source |
|---|---|
| `product_id` | The product being restocked |
| `delta` | `new_stock_quantity - old_stock_quantity` (positive) |
| `reason` | `'restock'` |
| `order_id` | `null` (restocks aren't tied to an order) |
| `created_at` | Defaults to `now()` — this is the timestamp Just Dropped's freshness window measures against |

### Featured Selection

Fields directly on `products` (see table above) — no separate table, matching
how New Arrival is already modeled.

## Validation rules

- `featured_end`, if set, MUST be after `featured_start` if both are set (mirrors existing New Arrival validation, if any exists — confirm during implementation and apply the same rule for consistency).
- A `stock_movements` row with `reason='restock'` MUST have a positive `delta` (the existing `CHECK` doesn't enforce delta sign per reason; enforce at the application layer where the insert happens, matching how `'sale'`/`'return'` inserts already use negative/positive deltas by convention without a DB-level per-reason sign constraint).

## State transitions

- **Featured**: `is_featured` toggled by a merchant; independent of any other field. No automatic transitions.
- **Best Seller / Trending eligibility**: Not a stored state — recomputed at read time from current `best_seller_score`/`trending_score` and the current category-relative normalization, so a product's eligibility can change on any read as soon as the underlying score changes (no explicit transition to model; FR-008).
- **Just Dropped eligibility**: Not stored — recomputed at read time from the most recent `restock` row's `created_at` relative to now, per the unchanged 72-hour window (research.md #5).
