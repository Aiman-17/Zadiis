# Quickstart: Verifying US1 + US2

## US1 — Notification Center

1. Apply `store/supabase/admin-notifications.sql` to the Supabase project (via SQL editor or CLI migration, matching how `requests-tables.sql` was originally applied).
2. Start the dev server (`npm run build && npm run start` in `store/` — per this repo's known Turbopack dev-server hang workaround, do not use `next dev` for verification).
3. Trigger each of the four event types against a real/local test order:
   - Submit a cancellation request via `/api/requests/cancel` (or the storefront cancel flow).
   - Submit a return and an exchange request via `/api/requests/return`.
   - Confirm a payment via `/api/payments/verify` or the Safepay webhook path, **and** separately via the admin manually marking a COD order "delivered" / setting `payment_status=paid` in `/admin/orders` (call sites 6/7 — both must produce a notification).
4. Open `/admin` — confirm the bell icon shows the correct unread count within one 30s poll cycle (or immediately on next page load).
5. Open `/admin/notifications` — confirm all four event types appear with correct order links, confirm placing a **new order** does NOT produce an entry (FR-001's explicit exclusion).
6. Mark all as read — confirm the badge clears and previously-unread rows are visually distinguished as read (FR-002, acceptance scenario 3).
7. Archive one notification — confirm it disappears from the main list but is recoverable. Delete another — confirm the `confirm()` dialog fires and, once confirmed, the row is permanently gone (FR-002a).
8. Mobile check (constitution Principle II): repeat steps 4-7 at a 375px viewport.

## US2 — YoY Analytics

1. With the store's current ~1-month order history (starts 2026-06-07 per repo history), open `/admin/analytics?tab=revenue` — confirm the YoY widget shows the collapsed "insufficient history" message, not a chart, zero, or blank.
2. Repeat for `?tab=performance`.
3. Switch the global range filter through 7d/30d/90d/12m on both tabs — confirm every existing chart's output is unchanged (byte-for-byte, per FR-006/SC-005) and the YoY widget's collapsed state is unaffected by the range selection (proving the 24-month superset fetch is decoupled, per research.md Decision 4).
4. (Once 12+ months of order history exist, or with seeded historical test data) — confirm the YoY widget expands into a full chart (current year gold line, prior year gray dashed line, per research.md Decision 5) plus a supporting month-by-month table, and the headline `+X%`/`-X%` stat uses the existing green/red growth-indicator colors.

## Regression check (required before PR, per FR-006/SC-005)

Diff `/admin/analytics` output (all 5 tabs, all 4 range options) against the current `main`/pre-change branch — must be pixel-identical outside the two new YoY widgets.

## US4 — PDF Invoice (Session 2)

1. Place a real online-payment test order (not COD).
2. Confirm payment (via `/api/payments/verify` or the Safepay webhook path, as already exercised for US1's testing).
3. Confirm the payment-confirmation email attaches a file named `<invoice-number>.pdf` (not `.html`).
4. Open the PDF in a standard viewer — confirm it shows the same content as the old HTML version (invoice number, order number, bill-to, line items, subtotal/delivery/total, payment method + status + transaction ID), styled in Playfair Display/Inter with the brand gold/black/cream palette, not the PDF-library default fonts.
5. Confirm a COD order still produces no email invoice (unchanged behavior).
6. Open `/admin/invoices/[id]/print` for any order — confirm it renders exactly as before, completely unaffected.
