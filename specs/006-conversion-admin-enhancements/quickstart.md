# Quickstart: Verifying Conversion & Admin Enhancements

## US1 — Swipeable gallery
1. Open any product detail page with 3+ images on a 375px viewport.
2. Swipe left/right on the main image — confirm the active image changes.
3. Open the fullscreen zoom view — confirm swipe works there too, independently.
4. Open a single-image product — confirm no swipe/arrow controls render.

## US2 — Color-to-image matching
1. In admin, upload a product image and tag it with one of the product's colors.
2. On the storefront, select that color swatch — confirm the gallery's active image jumps to the tagged one.
3. Select an untagged color — confirm no error, gallery unaffected.
4. Confirm all other images remain browsable regardless of color selection.

## US3 — Free delivery toggle
1. Confirm current behavior: a 5+ item cart gets free delivery.
2. In admin settings, disable free delivery.
3. Confirm a 5+ item cart is now charged delivery at checkout.
4. Confirm the homepage Trust Bar and Shipping Info page no longer mention free delivery.
5. Re-enable and confirm both behavior and copy revert.

## US4 — Cancellation toggle
1. Confirm current behavior: a cancellation within 24 hours succeeds.
2. In admin settings, disable cancellations.
3. Confirm the footer's "Cancel an Order" link is gone.
4. Navigate directly to `/cancel-order` — confirm an "unavailable" message with a WhatsApp contact path, not the form.
5. Submit a cancellation directly via the API (bypassing the UI) — confirm it's rejected with the same message.
6. Confirm Returns is completely unaffected throughout.
7. Re-enable and confirm the full flow works again.

## US5 — Promo popup cards
1. With an active sale, load the homepage in a fresh session — confirm the sale popup appears once.
2. Dismiss it, navigate to a shop page and a product page in the same session — confirm it doesn't reappear.
3. With free delivery enabled, confirm the free-delivery popup appears (visually distinct from the sale popup) and follows the same per-session dismissal rule.
4. Start a new session — confirm both popups can appear again.
5. With no active sale, confirm no sale popup appears anywhere.

## US6 — Mobile long-press row actions
1. On a 375px viewport, open each of Products, Orders, Invoices, Payments, and Notifications — confirm no destructive icons are visible by default.
2. Long-press a row on each — confirm the icons appear.
3. Tap a revealed icon — confirm the existing confirm() dialog (or existing archive behavior) still fires exactly as before.
4. Repeat at desktop width — confirm icons are visible and directly clickable, unchanged.

## US7 — Additional analytics visuals
1. Open Analytics > Inventory — confirm a new row-level product table appears alongside the existing cards/chart, which are unchanged.
2. Open Analytics > Performance (renamed "Sales Performance", see US10) — confirm new Featured/New-Arrival charts appear after existing content.
3. Switch the range filter across all 4 options — confirm every pre-existing chart's output is unchanged.

## US8 — Badge lift analytics
1. Mark a product Featured with enough order history before and after.
2. Confirm a before/after sales-velocity comparison appears with a visible correlation-not-causation caveat.
3. Mark a product with insufficient history — confirm an "insufficient data" state, not a misleading number.

## US9 — Slow Mover consolidation
1. Before the fix: note which products are flagged Slow Mover in the product list vs. either sales-creation screen — confirm they can currently disagree (the bug this fixes).
2. After the fix: confirm the same product set is flagged Slow Mover in all three locations.
3. Confirm the new shared average-sell-through baseline excludes `is_new_arrival` products, as decided in `research.md` Decision 9.

## US10 — Tab renames
1. Open Analytics — confirm "Products" now reads "Merchandising" and "Performance" now reads "Sales Performance."
2. Click into each — confirm content, filters, and URL/`?tab=` behavior are unchanged.

## US11 — Admin dark mode
1. Toggle dark mode from the admin sidebar/top bar.
2. Navigate across several admin pages including Analytics — confirm the entire panel (not just some pages) is dark, and every chart remains legible.
3. Reload the browser — confirm the preference persisted.
4. Toggle back off — confirm full return to the light theme.

## Regression check (required before PR, per FR-006/SC-006)
Diff `/admin/analytics` output (all 5 tabs — now "Merchandising"/"Sales Performance" per US10 — all 4 range options) against pre-change `main` — must be pixel-identical outside the new US7/US8 additions.
