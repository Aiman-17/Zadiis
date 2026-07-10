# Data Model: Conversion & Admin Enhancements

## New column: `products.image_colors`

| Column | Type | Notes |
|---|---|---|
| `image_colors` | `text[]` | Nullable, index-aligned with the existing `images text[]` column (schema.sql:18). Position *i* in `image_colors` tags the color of the image at position *i* in `images`, or `null` if untagged. |

**No DB constraint enforces the pairing** (flagged as a risk in the plan) — every write path (`ImageUploader.tsx`'s upload handler, and any future image-delete/reorder path) must keep the two arrays in lockstep manually.

**SQL file**: `store/supabase/color-image-tagging.sql`, flat file at the repo root convention (matching `requests-tables.sql`, `exchange-columns.sql`, `admin-notifications.sql`).

## New `store_settings` keys

| Key | Values | Consumers |
|---|---|---|
| `free_delivery_enabled` | `'true'` / `'false'`, defaults to `'true'` (preserves current always-on behavior) | `checkout/page.tsx` (charge logic), `shipping/page.tsx` (copy), `page.tsx` homepage (Trust Bar copy), `PromoPopup.tsx` (free-delivery card visibility) |
| `cancellations_enabled` | `'true'` / `'false'`, defaults to `'true'` (preserves current always-on behavior) | `Footer.tsx` (link visibility), `cancel-order/page.tsx` (form vs. unavailable state), `api/requests/cancel/route.ts` (server-side enforcement) |

Both follow the exact `cod_enabled` schema/API/UI pattern — no new table, no new route, just two new rows in the existing generic key-value table.

## No new entity for: US1 (swipe), US6 (long-press), US7/US8 (analytics), US9 (slow mover), US10 (renames), US11 (dark mode)

All of these are either pure client-side interaction changes (US1, US6), derived/computed from existing data with no persistence (US7, US8 — same as spec 004's YoY widgets), a pure refactor with no schema implication (US9), a label-only change (US10), or a client-side preference stored in `localStorage`, not the database (US11's theme preference — consistent with how `cart-store.ts` already handles client-only state that doesn't need server persistence).

## US5 — Promo Popup: no persisted entity

Dismissal state lives in `sessionStorage` only (cleared on browser/tab close), not the database — matches the spec's explicit "per-session, not permanent" requirement (US5 edge case, SC-003-adjacent). No new table.
