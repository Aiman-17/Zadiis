# Research: US1 (Notification Center) + US2 (YoY Analytics)

No `NEEDS CLARIFICATION` markers remain in the Technical Context — every decision below was resolved either through this session's clarification pass (recorded in spec.md's `## Clarifications`) or through direct verification against the current codebase (file:line citations below were re-read this session, not assumed from an earlier draft).

## Decision 1: New `admin_notifications` table vs. deriving from existing tables

**Decision**: New table `admin_notifications` (id, type, order_id, message, created_at, read_at, archived_at), file `store/supabase/admin-notifications.sql`.

**Rationale**: `cancellation_requests` and `return_requests` (`store/supabase/requests-tables.sql`) already exist and are queried by `store/src/app/api/admin/requests/route.ts`, but their `status` column means "resolved," not "seen" — overloading it for notification read-state would conflict with the existing cancel/return-resolution workflow. There is no persisted row anywhere for a "payment received" event (that path is email-only today). A dedicated table keeps all four event types symmetric and doesn't risk breaking the existing requests-resolution UI.

**Alternatives considered**: Deriving a synthetic feed by querying `cancellation_requests` + `return_requests` + a new payment-events table — rejected as more complex (two query shapes to reconcile) for no benefit over one uniform table.

## Decision 2: Where the four write call sites are, verified this session

**Decision**: `store/src/app/api/payments/verify/route.ts:80`, `store/src/app/api/webhooks/safepay/route.ts:108`, `store/src/app/api/requests/cancel/route.ts:80`, `store/src/app/api/requests/return/route.ts:127-137` (covers both `sendOwnerReturnRequest` at line 134 and `sendOwnerExchangeRequest` at line 129).

**Rationale**: Re-grepped `sendOwnerPaymentReceived|sendOwnerCancellationRequest|sendOwnerReturnRequest|sendOwnerExchangeRequest` across `store/src/app` this session — all four call sites confirmed at the cited lines. `store/src/app/api/admin/orders/route.ts` also calls `sendOwnerPaymentReceived` (lines 155, 174) for the admin-manual "mark delivered" COD flow — **this is a fifth call site, previously missed**. It must also write a notification, or COD payment-received events triggered by the admin's own manual delivery-marking action would silently not appear in the notification center, while the same event triggered by an online payment webhook would. Added to Phase 1 design.

**Correction found and verified**: `store/src/app/api/requests/cancel/route.ts:27`'s order lookup selects only `order_status, created_at, customer_email, customer_name` — no `id`. This must be added to the select before that call site can populate `admin_notifications.order_id`. Confirmed by direct file read this session, not assumed.

## Decision 3: Notification read/archive/delete model

**Decision**: `read_at` (nullable timestamp, set on view — simple unread-count model, not the diff-based counter pattern already used for the Orders nav badge). `archived_at` (nullable timestamp, soft-delete — recoverable). Hard delete removes the row permanently, gated behind the same `confirm()` pattern already used for Invoices/Payments' irreversible delete.

**Rationale**: Single-admin assumption holds throughout this codebase (no multi-admin auth exists anywhere) — a single `read_at`/`archived_at` pair per row is sufficient, no per-user read-state table needed. The existing `admin/layout.tsx` polling pattern (`check()`, lines 26-58) is diff-based — it only shows the delta of *new* orders since the last poll, which is wrong for notifications: a merchant reloading the page should see the true count of everything still unread, not just what changed since their last poll. This is a deliberate divergence from that pattern, not a reuse of it.

## Decision 4: YoY data-fetch architecture

**Decision**: `store/src/app/admin/analytics/page.tsx` gains a second, unconditional trailing-24-month Supabase fetch (`orders.gte('created_at', twentyFourMonthsAgo)`), passed to `AnalyticsClient` as a new prop (e.g. `ordersForYoY`), alongside the existing range-filtered `orders` fetch (lines 28-43) which is left byte-for-byte unchanged.

**Rationale**: Verified `getRangeStart()` (lines 7-14) and the orders fetch (`gte('created_at', from)`, line 33) this session — `from` is derived from whichever range the user has selected (7d/30d/90d/12m). Selecting anything but `12m` would starve a YoY computation reusing the same `orders` prop. A second, independent fetch is the only way to guarantee the YoY widgets always have a full 24-month window regardless of the user's range selection, while guaranteeing zero behavior change to the existing range-filtered charts (FR-006) since their input data is untouched.

**Alternatives considered**: Always fetching 24 months and client-filtering down to the selected range for the existing charts too — rejected: even though `buildAllBuckets`/`buildTrendData` (lines 61-96, 98+) would likely produce identical output, this touches the data path every existing chart depends on, which is a strictly larger diff and risk for the additive-only requirement (FR-006) than adding a second, separate fetch.

## Decision 5: YoY chart form and bucketing reuse

**Decision**: Reuse the trailing-12-month bucket-building shape already in `buildAllBuckets` (`AnalyticsClient.tsx:61-73`, the `range === '12m'` branch) as the pattern for a new sibling function taking an explicit `monthsBack` count (not the range string), applied twice — once for the trailing 12 months (current), once for the 12 months before that (prior) — from the 24-month superset.

**Rationale**: `buildAllBuckets`'s `12m` branch already does exactly the "trailing N months from today, keyed by `YYYY-MM`" shape a YoY computation needs; forcing the *existing* range-driven function to also serve the YoY widgets (via a fake `range` value) would couple two independent concerns. A small sibling function keeps them decoupled while still reusing the proven bucketing logic and label-formatting convention.

**Dataviz approach**: Per the `dataviz` skill (invoked earlier this session) — this is an "emphasis" chart, not pure categorical: current year in the existing brand gold `#A68B6E` (already the single-series Revenue-tab line color at `AnalyticsClient.tsx:666`), prior year in muted gray, dashed. A stat-tile headline (`+X% YoY`) uses the existing green/red growth-indicator convention already present for period-over-period growth (lines 154-157). A supporting month-by-month table ships alongside the chart, satisfying both the dataviz skill's "table view" accessibility requirement and the user's explicit request for chart+table pairing.

## Decision 6: Notification "NEW" badge visual

**Decision**: Reuse the exact pill-badge style already established for merchandising badges (`AdminProductsClient.tsx:88`'s `✦ New` styling — `text-xs px-1.5 py-0.5 rounded-full` with a light-background/dark-text color pair), applied to unread notification rows, rather than inventing a new visual language for the notification center.

**Rationale**: Constitution Principle VI (Brand Consistency) — "no ad-hoc styling decisions may deviate from the design system." The badge convention already exists and is well-established across the admin panel; a new visual would be inconsistent for no functional benefit.

---

# Research addendum: User Story 4 (PDF Invoice), Session 2

## Decision 7: `@react-pdf/renderer` for server-side PDF generation

**Decision**: `@react-pdf/renderer`, using its `renderToBuffer()` API to produce a `Buffer` directly, matching the existing `Buffer.from(...).toString('base64')` attachment pattern in `email.ts:319-333`.

**Rationale**: It's the standard library for generating real PDFs from a React component tree in a Node/server context — no headless browser dependency (unlike Puppeteer-based approaches), which matters for a serverless-friendly Next.js API route. Confirmed via web search this session that `renderToBuffer()` is explicitly documented for "Node.js Server Actions or API Routes," returning a `Buffer` usable directly.

**Alternatives considered**: Puppeteer/headless-Chrome HTML-to-PDF (rejected — heavy dependency, slow cold starts, overkill for a text-and-table invoice); `jsPDF` (rejected — imperative canvas-style API, not a natural fit for a React-component-tree-based system like the rest of this codebase's email templates).

## Decision 8: Bundle local TTF fonts, not remote Google Fonts URLs

**Decision**: Bundle actual TTF font files in the repo (`store/src/lib/fonts/`) for Playfair Display and Inter, registered via local file paths.

**Rationale**: Verified via web search this session — registering fonts via Google Fonts CDN URLs (the initial idea) is a documented reliability risk for this specific library: Google Fonts serves WOFF2, which `@react-pdf/renderer` supports poorly (TTF/OTF preferred), and `Font.register()`'s async download can race with `renderToBuffer()` since there's no built-in await-font-readiness mechanism — a real, reported failure mode (see GitHub issue diegomura/react-pdf#2675, fonts stuck effectively unloaded). Local file registration is explicitly supported server-side in Node.js and avoids both failure modes entirely — no network fetch at render time.

**Alternatives considered**: Built-in PDF fonts (Helvetica/Times-Roman) — rejected, doesn't satisfy FR-009's brand-matching requirement, would look visibly generic against the store's established Playfair Display/Inter identity.

## Decision 9: Scope boundary — email attachment only, not the admin print view

**Decision**: Only `email.ts`'s attachment-generation call site changes. `store/src/app/admin/invoices/[id]/print/page.tsx` (the admin's browser-based print view) is untouched.

**Rationale**: Per this session's clarification — the print view already works today via the browser's native print-to-PDF, a completely separate, already-functioning mechanism with no code overlap with the email attachment path. Expanding scope to unify them would be a larger, riskier change than what was asked for, and isn't needed to satisfy any FR in this spec.
