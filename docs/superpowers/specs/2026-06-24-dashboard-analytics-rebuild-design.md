# Dashboard & Analytics Rebuild — Design Spec
**Date:** 2026-06-24  
**Status:** Approved  
**Scope:** Dashboard operational rebuild, Analytics page, Orders archive system, Auth middleware, Email merge, Bot protection

---

## 1. Problem Statement

Five compounding problems in the current system:

1. **Dashboard charts only show paid orders** — COD orders (75% of ZADII'S traffic) are invisible to Order Status Donut and Top Products. Numbers are wrong.
2. **No `cancelled` order status** — WhatsApp cancellations have nowhere to go. Cancelled orders counted as real revenue.
3. **No discount tracking** — `original_price` not stored at order time. Sale performance is unmeasurable.
4. **No admin auth guard** — `/admin/*` routes are publicly accessible without login.
5. **Duplicate owner emails on sale orders** — `sendOwnerNewOrder` + `sendOwnerSaleOrder` both fire = two emails per sale order.

---

## 2. Architecture Decision

### Dashboard = Operational (daily use)
Fixed context, no date filters. Answers: *what needs attention right now?*

### Analytics = Business Intelligence (weekly use)
Full date picker (7D / 30D / 90D / 12M), tab-based sections. Answers: *how is the business performing over time?*

### Orders = Archive not Delete
`is_archived` boolean. Archived orders hidden from default view but remain in DB for accurate revenue/analytics forever.

---

## 3. Database Migrations

### Migration 1 — Cancelled status
```sql
ALTER TABLE orders DROP CONSTRAINT orders_order_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_order_status_check
  CHECK (order_status IN (
    'new','processing','shipped','delivered','returned','cancelled'
  ));
```

### Migration 2 — Cancellation reason
```sql
ALTER TABLE orders ADD COLUMN cancellation_reason text
  CHECK (cancellation_reason IN (
    'customer_changed_mind','no_response','wrong_address',
    'duplicate_order','out_of_stock','delivery_delay','other'
  ));
```

### Migration 3 — Archive flag
```sql
ALTER TABLE orders ADD COLUMN is_archived boolean DEFAULT false;
```

### Migration 4 — original_price in items (no schema change)
`items` is JSONB — we start storing `original_price` in each item at order creation.
Old orders without it: `original_price` defaults to `price` in code (zero discount, correct).

---

## 4. TypeScript Type Updates

```typescript
// OrderItem — add original_price
export type OrderItem = {
  product_id: string
  product_name: string
  sku?: string
  size: string
  color: string
  quantity: number
  price: number
  original_price: number  // NEW — what it costs without sale
}

// Order — add cancelled status, cancellation_reason, is_archived
export type Order = {
  // ...existing fields...
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned' | 'cancelled'
  cancellation_reason?: string | null
  is_archived: boolean
}
```

---

## 5. Revenue Calculation Rules

| Metric | Formula |
|---|---|
| Gross Revenue | Sum of `total` for ALL orders in period |
| Net Revenue | Sum of `total` WHERE order_status NOT IN ('cancelled', 'returned') |
| Cancelled Revenue | Sum of `total` WHERE order_status = 'cancelled' |
| Returned Revenue | Sum of `total` WHERE order_status = 'returned' |
| Discounts Given | Sum of `(original_price - price) × quantity` across all items in period |

---

## 6. Dashboard Layout (Operational)

```
Row 1 — KPI Cards (fixed: this calendar month)
  Revenue This Month (net) | Orders This Month | Pending Action | Low Stock Count

Row 2 — Warning Row (red/amber cards)
  Cancelled This Month (PKR + count) | Returned This Month (PKR + count)
  → Hidden if both are zero

Row 3 — Charts
  Order Status Donut (ALL orders, not just paid) | Top Products (30-day rolling, all orders)

Row 4 — Recent Orders Table (last 10, all statuses)
```

**No date filter on dashboard. Fixed context only.**

---

## 7. Analytics Page Layout (`/admin/analytics`)

Global date filter tabs at top: `[7 Days] [30 Days] [90 Days] [12 Months]`  
Default: 30 Days. Filter applies to all tabs.

### Tab 1 — Revenue
- KPI row: Gross Revenue / Net Revenue / Cancelled / Returned / Discounts Given
- Revenue Trend line chart (daily ≤30D, weekly >30D)
- Orders Trend line chart (separate from revenue)
- Payment Methods donut (COD / JazzCash / EasyPaisa / Card)

### Tab 2 — Products
- Top Products horizontal bar (units + revenue side by side)
- Top Colors horizontal bar
- Top Sizes horizontal bar
- Top Cities horizontal bar

### Tab 3 — Inventory
- Low Stock Variants list (≤5 units, warn)
- Out of Stock list (0 units, critical)
- Total Inventory Value (sum of price × stock_quantity across all active products)

### Tab 4 — Cancellations
- Cancellation rate (cancelled / total orders × 100)
- Cancelled Revenue (PKR)
- Reasons breakdown bar chart

---

## 8. Orders Page Changes

**New filter tabs:** `[Active] [Delivered] [Archived]` (replaces current time-based filters which move to "All" view)

**Cancel flow:**
1. Admin clicks Cancel button on an order
2. Modal appears: "Select cancellation reason" (6 options + Other)
3. On confirm: order_status → 'cancelled', cancellation_reason saved
4. Order stays visible (not archived) so admin sees it happened

**Archive flow:**
1. Archive button appears on delivered orders
2. One click, no confirmation modal needed
3. Archived orders hidden from Active/Delivered tabs
4. Visible under Archived tab

**No delete button** — archive is the only removal action.

---

## 9. Middleware (Admin Auth Guard)

File: `store/src/middleware.ts`

- Protects all routes matching `/admin/:path*`
- Excludes `/admin/login`
- Checks `admin-auth` cookie matches `ADMIN_PASSWORD` env var
- Redirects to `/admin/login` on failure
- Returns 401 for `/api/admin/*` routes (no redirect for API)

---

## 10. Email Consolidation

Delete `sendOwnerSaleOrder`. Merge into `sendOwnerNewOrder` with `is_sale` parameter.

```typescript
// Before: two separate functions, both called on sale orders
sendOwnerNewOrder(...)         // always fires
sendOwnerSaleOrder(...)        // also fires if is_sale = true → duplicate email

// After: one function, is_sale flag changes subject line only
sendOwnerNewOrder({ ...data, is_sale: true })
// Subject: "🛍️ SALE — New order ZD-1024 — COD — PKR 4,500"
// Subject: "New order ZD-1024 — COD — PKR 4,500"  (normal)
```

---

## 11. Bot Protection (Code Changes)

### Honeypot on checkout form
Hidden input `name="website"`. If value present on order submission → reject silently with 200 OK (don't tell bots they were caught).

### Rate limiting on `/api/orders`
Max 5 order attempts per IP per hour. Uses Vercel request headers for IP detection. Returns 429 on breach.

---

## 12. Sidebar Navigation Update

```
Dashboard
Products
Orders
Payments
Invoices
Sales
Analytics    ← NEW
Settings
```

---

## 13. Data Sourcing Rules

| Page / Chart | Uses | Excludes |
|---|---|---|
| Dashboard KPIs | All orders | Nothing |
| Dashboard Donut | All orders | Nothing |
| Dashboard Top Products | All orders | Cancelled |
| Revenue (Analytics) | All orders incl. archived | Nothing (shows gross then nets down) |
| Products (Analytics) | All orders | Cancelled |
| Inventory (Analytics) | Products table directly | Inactive products |
| Cancellations (Analytics) | Cancelled orders only | — |

---

## 14. Cloudflare Setup (Manual — No Code)

1. Create free Cloudflare account
2. Add domain zadiis.com.pk
3. Cloudflare auto-imports DNS records
4. Update nameservers at domain registrar to Cloudflare's two nameservers
5. In Cloudflare dashboard: Security → Bot Fight Mode → ON
6. WAF → Rate Limiting: `/api/orders*` → more than 10 req/min → Block

Takes effect within 24 hours of nameserver change.

---

## 15. Out of Scope (This Sprint)

- Customer accounts / login
- CSV export for accounting
- WhatsApp notification on new order
- Repeat purchase rate / cohort analysis
- Forecasting
- Accounting software integration
