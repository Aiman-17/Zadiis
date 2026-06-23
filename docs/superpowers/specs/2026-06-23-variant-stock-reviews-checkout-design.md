# Spec: Sprint 4 + Variant Stock — Unified Design

**Date:** 2026-06-23
**Branch:** main
**Status:** Approved for planning

---

## Overview

This spec combines two workstreams into one unified plan so they share a single DB migration, type file, and implementation order with no conflicts.

**Workstream A — Variant Stock & Quick Fixes** (new, from this session):
1. Variant-level stock (color × size matrix, single JSONB column)
2. Reviews privacy message
3. Checkout email mandatory
4. Image `sizes` prop fix

**Workstream B — Sprint 4: Trust, SEO & Sale** (previously planned):
5. Trust strip 5-item update + policy pages + footer links
6. SEO: OG metadata, sitemap.xml, robots.txt, product JSON-LD
7. DB migration: `sales`, `sale_products`, `is_sale` on orders, `is_bestseller` on products
8. Admin sales management
9. Public sale API + delivery override at checkout + sale owner email
10. Sale store page + homepage sale banner + best sellers section + ProductCard sale badge
11. Admin bestseller toggle on product form

---

## Global Constraints (apply to every task)

- `export const dynamic = 'force-dynamic'` must be the **very first line** (before all imports) on every admin server page and on `sitemap.ts`
- No arbitrary Tailwind color classes — use `style={{}}` for all brand colors
- Brand colors: bg `#FAF8F5`, text `#1C1C1C`, accent `#A68B6E`, border `#E8DDD4`
- All admin API routes and admin server components use `supabaseAdmin` from `@/lib/supabase/server`
- Store-facing reads in `lib/products.ts` use `supabase` (anon client) from `@/lib/supabase/client`
- `params` in App Router is a Promise — always `const { x } = await params`
- `npx tsc --noEmit` must pass with zero errors after every task

---

## Scope

### In scope
- One combined SQL migration file covering all new columns and tables
- One updated `types/index.ts` covering all new types at once
- Variant stock grid in admin product forms (create + edit)
- Updated `decrement_product_stock` RPC (adds color+size decrement)
- `AddToCartButton`: disabled state for sold-out variants
- Trust bar, policy pages, footer links
- SEO metadata, sitemap, robots, product JSON-LD
- Admin sales CRUD + product-per-sale management
- Public sale API, delivery override, checkout sale delivery, sale owner email
- Sale store page, homepage sale banner, best sellers section, ProductCard sale badge
- Admin bestseller toggle
- Reviews privacy message
- Checkout email mandatory
- Image `sizes` prop fix on hero + gallery

### Out of scope
- No bulk variant stock import
- No variant-level pricing (all combos share the same product price)
- No customer "notify me when back in stock"
- No stock history or audit log
- No changes to admin orders, invoices, payments, or settings pages

---

## 1. Database Migration (single file, run once)

File: `store/supabase/sprint4-combined.sql`

```sql
-- ─── Variant stock on products ───────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant_stock jsonb NOT NULL DEFAULT '{}';

-- ─── Best seller flag on products ────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;

-- ─── Sales table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title           text NOT NULL,
  description     text,
  banner_image    text,
  delivery_charge decimal(10,2) NOT NULL DEFAULT 150,
  ends_at         timestamptz,
  is_active       boolean NOT NULL DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Only one active sale at a time
CREATE UNIQUE INDEX IF NOT EXISTS only_one_active_sale
  ON sales (is_active) WHERE is_active = true;

-- ─── Sale products join table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sale_products (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id     uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sale_price  decimal(10,2) NOT NULL,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(sale_id, product_id)
);

-- ─── is_sale flag on orders ───────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_sale boolean NOT NULL DEFAULT false;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages sales"
  ON sales FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can view active sales"
  ON sales FOR SELECT USING (is_active = true);

CREATE POLICY "Service role manages sale_products"
  ON sale_products FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public can view sale_products"
  ON sale_products FOR SELECT USING (true);

-- ─── Updated decrement RPC (adds variant_stock + is_bestseller awareness) ────
CREATE OR REPLACE FUNCTION decrement_product_stock(
  p_product_id uuid,
  p_qty        int,
  p_color      text DEFAULT '_',
  p_size       text DEFAULT '_'
)
RETURNS void AS $$
DECLARE
  v_color    text := COALESCE(NULLIF(p_color, ''), '_');
  v_size     text := COALESCE(NULLIF(p_size,  ''), '_');
  v_current  int;
  v_stock    jsonb;
BEGIN
  SELECT variant_stock INTO v_stock
  FROM products WHERE id = p_product_id FOR UPDATE;

  -- Decrement variant cell only if it exists and has enough stock
  v_current := COALESCE((v_stock -> v_color ->> v_size)::int, 0);
  IF v_current >= p_qty THEN
    v_stock := jsonb_set(
      v_stock,
      ARRAY[v_color, v_size],
      to_jsonb(v_current - p_qty)
    );
  END IF;

  UPDATE products SET
    variant_stock  = v_stock,
    stock_quantity = (
      SELECT COALESCE(SUM((cell.value)::int), 0)
      FROM jsonb_each(v_stock) AS color_kv,
           jsonb_each(color_kv.value) AS cell
    )
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
```

---

## 2. TypeScript Types (`store/src/types/index.ts`)

One complete replacement covering all new fields:

```ts
export type Category = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export type Product = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  category_id: string
  images: string[]
  sizes: string[]
  colors: string[]
  stock_quantity: number
  variant_stock: Record<string, Record<string, number>>  // {"Black":{"M":5,"L":2}}
  sku?: string
  is_active: boolean
  is_bestseller: boolean
  created_at: string
  categories?: Category
}

export type OrderItem = {
  product_id: string
  product_name: string
  sku?: string
  size: string
  color: string
  quantity: number
  price: number
}

export type Order = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  city: string
  items: OrderItem[]
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: 'jazzcash' | 'easypaisa' | 'card' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned'
  safepay_tracker?: string
  safepay_transaction_id?: string
  payment_verified_at?: string
  is_sale: boolean
  created_at: string
}

export type DeliveryZone = {
  id: string
  city: string
  delivery_charge: number
  is_active: boolean
  created_at: string
}

export type Review = {
  id: string
  product_id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
}

export type Sale = {
  id: string
  title: string
  description: string | null
  banner_image: string | null
  delivery_charge: number
  ends_at: string | null
  is_active: boolean
  created_at: string
  sale_products?: SaleProduct[]
}

export type SaleProduct = {
  id: string
  sale_id: string
  product_id: string
  sale_price: number
  created_at: string
  products?: Product
}
```

---

## 3. Variant Stock — Admin UI

### Variant grid component

A reusable section rendered inside both the new product form and the edit form, placed **below the Sizes section**. It is shown only when at least one size or color is defined.

**State shape in the form:**
```ts
variantStock: Record<string, Record<string, number>>
// initialised from product.variant_stock on edit, {} on create
```

**Grid rendering rules:**

| Situation | Grid shape |
|---|---|
| Colors + regular sizes | Full grid: colors as rows, sizes as columns |
| Colors + Unstitched (no regular sizes) | Single column: each color gets one stock input using sentinel key `"_"` |
| No colors, regular sizes only | Single row: each size gets one stock input using sentinel key `"_"` for color |
| Neither colors nor sizes defined | Grid hidden |

**Visual example (colors + sizes):**

```
Stock per Variant

             S     M     L     XL
Black       [3]   [5]   [4]   [2]
White       [0]   [3]   [0]   [6]

Total stock: 23  (read-only, auto-calculated from sum of all cells)
```

Cells are `<input type="number" min="0">`. Total is recalculated live as admin edits.

On save, `variant_stock` is sent as the nested object. `stock_quantity` is sent as the calculated sum.

### Backward compatibility

Existing products with `variant_stock: {}` work without change — the grid starts empty (all cells 0). The admin only fills it in if they want per-variant tracking. Products never forced to have it.

---

## 4. Variant Stock — Decrement (Order APIs)

Both `store/src/app/api/orders/route.ts` and `store/src/app/api/payments/tracker/route.ts` already loop through order items calling `decrement_product_stock`. Updated call:

```ts
// Before
await supabaseAdmin.rpc('decrement_product_stock', {
  p_product_id: item.product_id,
  p_qty: item.quantity,
})

// After
await supabaseAdmin.rpc('decrement_product_stock', {
  p_product_id: item.product_id,
  p_qty: item.quantity,
  p_color: item.color || '_',
  p_size:  item.size  || '_',
})
```

The RPC handles the rest atomically.

---

## 5. Variant Stock — Product Detail Page (`AddToCartButton.tsx`)

### Logic

```ts
const hasTracking = Object.keys(product.variant_stock).length > 0

// Before a color is chosen: size available if any color has stock for it
function isSizeAvailable(size: string): boolean {
  if (!hasTracking) return true
  if (!selectedColor) {
    return Object.values(product.variant_stock).some(
      sizes => (sizes[size] ?? 0) > 0
    )
  }
  const colorKey = selectedColor || '_'
  const sizeKey  = size || '_'
  return (product.variant_stock[colorKey]?.[sizeKey] ?? 0) > 0
}

function isColorAvailable(color: string): boolean {
  if (!hasTracking) return true
  const sizes = product.variant_stock[color]
  if (!sizes) return true   // untracked → assume available
  return Object.values(sizes).some(n => n > 0)
}
```

### Disabled state styling

**Sold-out size button:**
- Gray border (`#E8DDD4`), text color `#9CA3AF`, `text-decoration: line-through`
- `cursor: not-allowed`, `pointer-events: none`, not selectable

**Sold-out color swatch:**
- Opacity `0.35`, diagonal strikethrough via CSS background gradient overlay
- `cursor: not-allowed`, `pointer-events: none`

Variants are **disabled, not hidden** — customers see the full range and know what is temporarily unavailable.

### "Only N left" hint

When both color and size are selected and the specific variant has 1–5 units:
```tsx
<p className="text-sm" style={{ color: '#B45309' }}>
  Only {qty} left in this combination
</p>
```

---

## 6. Reviews Privacy Message (`ReviewForm.tsx`)

Immediately below the `"Write a Review"` heading, before the star picker:

```tsx
<p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
  🔒 Your privacy matters to us. We only display your name and review — your personal information is never shared.
</p>
```

No other changes to reviews layout, grid, or `ReviewListWrapper`.

---

## 7. Checkout Email — Mandatory (`checkout/page.tsx`)

| Element | Before | After |
|---|---|---|
| Label | `Email (optional — for order updates)` | `Email *` |
| Input | no `required` | `required` |
| Payload | `form.email \|\| null` | `form.email` |

No API changes needed.

---

## 8. Image `sizes` Prop Fix

| File | Element | `sizes` value |
|---|---|---|
| `store/src/app/(store)/page.tsx` hero | Full-width banner | `"100vw"` |
| `ProductImageGallery.tsx` main image | Half-page on desktop | `"(max-width: 768px) 100vw, 50vw"` |
| `ProductImageGallery.tsx` thumbnails | Small strip | `"(max-width: 768px) 25vw, 12vw"` |

Zero visual change. Resolves the Next.js console warning and improves LCP.

---

## 9. Trust Strip + Policy Pages + Footer Links

### Trust bar (`store/src/app/(store)/page.tsx`)

Replace 3-item trust bar with 5-item version:

```tsx
import { Truck, RefreshCw, MapPin, Banknote, MessageCircle } from 'lucide-react'

<section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
  <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-3 text-sm text-gray-600">
    <div className="flex items-center gap-2"><Truck size={16} style={{ color: '#A68B6E' }} />Free delivery over PKR 2,000</div>
    <div className="flex items-center gap-2"><Banknote size={16} style={{ color: '#A68B6E' }} />Cash on Delivery available</div>
    <div className="flex items-center gap-2"><RefreshCw size={16} style={{ color: '#A68B6E' }} />7-day easy exchange</div>
    <div className="flex items-center gap-2"><MapPin size={16} style={{ color: '#A68B6E' }} />Nationwide delivery</div>
    <div className="flex items-center gap-2"><MessageCircle size={16} style={{ color: '#A68B6E' }} />WhatsApp support</div>
  </div>
</section>
```

### New policy pages

| Route | File |
|---|---|
| `/returns` | `store/src/app/(store)/returns/page.tsx` |
| `/shipping` | `store/src/app/(store)/shipping/page.tsx` |
| `/privacy` | `store/src/app/(store)/privacy/page.tsx` |

All three are static server components. Content: professional policy text appropriate for a Pakistani fashion store. Each references WhatsApp for support and `info@zadiis.com.pk` for contact.

### Footer (`store/src/components/layout/Footer.tsx`)

Three-column footer replacing the current minimal footer:

```
ZADIIS               Shop              Help
Modern Pakistani     All Products      Returns & Exchanges
women's fashion.     About Us          Shipping Policy
Quality you can      Contact           Privacy Policy
feel.                                  WhatsApp Support
                                       info@zadiis.com.pk
```

Dark background (`#1C1C1C`), white text, accent `#9CA3AF` for links.

---

## 10. SEO

### Root layout (`store/src/app/layout.tsx`)

Full `Metadata` object with:
- `metadataBase` from `NEXT_PUBLIC_APP_URL`
- `title.template: "%s — ZADII'S"`
- `description`, `keywords`, `openGraph`, `twitter`, `robots`, `alternates.canonical`

### `store/src/app/sitemap.ts`

`export const dynamic = 'force-dynamic'` as first line. Fetches all active products from Supabase via `supabaseAdmin`, returns static routes + dynamic product URLs.

### `store/src/app/robots.ts`

Disallows `/admin`, `/api/`, `/checkout`, `/cart`, `/order/`. Points to sitemap URL.

### Product page (`store/src/app/(store)/shop/[slug]/page.tsx`)

Adds `generateMetadata` function (per-product OG title, description, image) and inline `<script type="application/ld+json">` with Product schema.

---

## 11. Admin Sales Management

### Sidebar entry

`store/src/app/admin/layout.tsx`: add `Tag` icon + "Sales" nav item after Invoices.

### API routes

| Route | Methods | Purpose |
|---|---|---|
| `/api/admin/sales` | GET, POST | List all sales, create new |
| `/api/admin/sales/[id]` | GET, PUT, DELETE | Get detail, update (incl. activate/deactivate), delete |
| `/api/admin/sales/[id]/products` | POST, DELETE | Add product to sale, remove product from sale |

**Activation rule:** when activating a sale, deactivate all others first (application-level), then activate. The DB unique index provides a second safety net.

### Pages

| Page | Type | Purpose |
|---|---|---|
| `/admin/sales` | Server | List with LIVE badge, Activate/Deactivate toggle, Manage link |
| `/admin/sales/new` | Client | Create form (title, description, flat delivery charge, optional end date) |
| `/admin/sales/[id]` | Server + Client form | Edit details, add/remove products, auto-fill sale price at 80% of original |

---

## 12. Sale — Public API, Delivery Override, Checkout, Email

### `/api/sale` (GET)

Returns `{ sale: Sale | null }` — the currently active sale with nested `sale_products` including full product data. Used by the sale store page.

### `/api/delivery-zones` update

Adds `sale_active: boolean` and `sale_delivery_charge: number | null` to the response. When a sale is active, the checkout applies the flat sale delivery charge to all cities regardless of the zone table.

### Checkout delivery logic

```ts
// In handleCityChange
if (saleActive && saleDeliveryCharge !== null) {
  setDeliveryCharge(saleDeliveryCharge)   // flat rate overrides city rate
} else {
  const zone = zones.find(z => z.city === city)
  setDeliveryCharge(zone?.delivery_charge ?? 0)
}
```

Delivery hint shows: `"Sale flat rate: PKR 150"` during active sale.

### `is_sale` flag on orders

Both `api/orders/route.ts` and `api/payments/tracker/route.ts` check `sales.is_active` count before inserting the order and set `is_sale: true/false` accordingly.

### `sendOwnerSaleOrder` in `lib/email.ts`

New email function with a "🏷️ SALE ORDER" header. When `is_sale` is true, uses this function instead of `sendOwnerNewOrder`.

---

## 13. Sale Store Page + Homepage + ProductCard

### `ProductCard.tsx`

Extended with optional `salePrice?: number` prop. When provided:
- Shows `X% OFF` badge (accent color, top-left)
- Displays sale price in accent color + original price with `line-through`
- Used only on the sale page — all other grids pass no `salePrice` (backward compatible)

### `/sale` page (`store/src/app/(store)/sale/page.tsx`)

`export const dynamic = 'force-dynamic'`. Fetches active sale via `supabaseAdmin`. Returns 404 if no active sale.

Layout:
1. **Sale hero** — dark background, sale title, description, countdown timer (if `ends_at` set)
2. **Stats bar** — "Exclusive sale prices · Flat PKR N delivery · Limited stock"
3. **Product grid** — `ProductCard` with `salePrice` for each sale product

### `CountdownTimer.tsx` client component

`store/src/components/sale/CountdownTimer.tsx` — updates every second, shows DD / HH / MM / SS. Shows "Sale has ended" when expired.

### Homepage (`store/src/app/(store)/page.tsx`) — full updated structure

```
Hero (unchanged layout, adds sizes="100vw")
  ↓
Trust Bar (5 items — updated)
  ↓
Sale Banner (dark section, only visible when sale is active)
  ↓
Most Loved / Best Sellers (only visible when is_bestseller products exist)
  ↓
New Arrivals (unchanged)
```

Hero section code is **not rewritten** — only the `sizes` prop is added to the hero `<Image>` and the trust bar items are updated. The rest of the page gets the sale banner and best sellers section added between existing sections.

### `lib/products.ts` update

Adds `getBestsellerProducts(limit)` function. `getProducts` and `getFeaturedProducts` are updated to exclude products currently in an active sale.

---

## 14. Admin Bestseller Toggle

Both `new/page.tsx` and `EditProductForm.tsx` get an `is_bestseller` checkbox (after the `is_active` checkbox):

```
☐ Best Seller (shown in "Most Loved" on homepage)
```

State, submit payload, and pre-fill on edit all updated. No API change needed (the products API already passes through all body fields).

---

## 15. Files Changed Summary

| File | Change |
|---|---|
| `store/supabase/sprint4-combined.sql` | New — single migration for all DB changes |
| `store/src/types/index.ts` | Complete replacement with all new types |
| `store/src/app/admin/layout.tsx` | Add Sales nav link |
| `store/src/app/admin/products/new/page.tsx` | Variant grid + is_bestseller checkbox |
| `store/src/app/admin/products/[id]/edit/EditProductForm.tsx` | Variant grid + is_bestseller checkbox |
| `store/src/app/api/admin/products/route.ts` | Pass variant_stock in insert/update |
| `store/src/app/api/admin/sales/route.ts` | New |
| `store/src/app/api/admin/sales/[id]/route.ts` | New |
| `store/src/app/api/admin/sales/[id]/products/route.ts` | New |
| `store/src/app/admin/sales/page.tsx` | New |
| `store/src/app/admin/sales/SaleToggle.tsx` | New client component |
| `store/src/app/admin/sales/new/page.tsx` | New |
| `store/src/app/admin/sales/[id]/page.tsx` | New |
| `store/src/app/admin/sales/[id]/SaleEditForm.tsx` | New client component |
| `store/src/app/api/orders/route.ts` | Pass color+size to RPC, is_sale flag, sale email routing |
| `store/src/app/api/payments/tracker/route.ts` | Pass color+size to RPC, is_sale flag, sale email routing |
| `store/src/app/api/delivery-zones/route.ts` | Add sale_active + sale_delivery_charge |
| `store/src/app/api/sale/route.ts` | New public sale endpoint |
| `store/src/lib/email.ts` | Add sendOwnerSaleOrder |
| `store/src/lib/products.ts` | Add getBestsellerProducts, update getProducts + getFeaturedProducts |
| `store/src/app/(store)/page.tsx` | Hero sizes prop, trust bar 5 items, sale banner, best sellers |
| `store/src/app/(store)/sale/page.tsx` | New |
| `store/src/app/(store)/returns/page.tsx` | New |
| `store/src/app/(store)/shipping/page.tsx` | New |
| `store/src/app/(store)/privacy/page.tsx` | New |
| `store/src/app/layout.tsx` | Full SEO metadata |
| `store/src/app/sitemap.ts` | New |
| `store/src/app/robots.ts` | New |
| `store/src/app/(store)/shop/[slug]/page.tsx` | generateMetadata + JSON-LD |
| `store/src/components/layout/Footer.tsx` | Three-column footer with policy links |
| `store/src/components/products/AddToCartButton.tsx` | Disabled variant logic |
| `store/src/components/products/ProductCard.tsx` | Optional salePrice prop + badge |
| `store/src/components/products/ReviewForm.tsx` | Privacy message |
| `store/src/components/sale/CountdownTimer.tsx` | New client component |
| `store/src/app/(store)/checkout/page.tsx` | Email required, sale delivery logic |
| `store/src/components/products/ProductImageGallery.tsx` | sizes props |

---

## 16. Implementation Order

Tasks must be done in this order to avoid type errors and missing dependencies:

1. **DB migration** — run `sprint4-combined.sql` in Supabase
2. **Types** — update `types/index.ts` (unlocks all subsequent TypeScript)
3. **Variant stock admin + RPC call updates** — admin forms + order APIs
4. **Quick fixes** — reviews message, checkout email, image sizes (independent, any order)
5. **Trust strip + policy pages + footer** — no dependencies
6. **SEO** — depends on policy pages existing for sitemap
7. **Admin sales management** — depends on `Sale`/`SaleProduct` types
8. **Sale public API + delivery override + checkout + email** — depends on admin sales
9. **Sale store page + homepage + ProductCard** — depends on sale API
10. **Admin bestseller toggle** — depends on `is_bestseller` type + DB column

---

## 17. Acceptance Criteria

### Variant stock
- [ ] Admin variant grid renders correctly for colors+sizes, color-only (unstitched), and size-only products
- [ ] Total stock auto-calculates from grid sum
- [ ] Edit page pre-fills grid from saved `variant_stock`
- [ ] Sold-out size shown as disabled (gray + strikethrough), not hidden
- [ ] Sold-out color shown as disabled (desaturated + overlay), not hidden
- [ ] After color selected, size availability re-evaluates against that color's stock
- [ ] "Only N left" hint appears for 1–5 remaining in selected combination
- [ ] Order placed → `variant_stock[color][size]` decrements, `stock_quantity` recalculates
- [ ] Products with `variant_stock: {}` behave exactly as before

### Reviews
- [ ] Privacy message visible below "Write a Review" heading on product detail page

### Checkout
- [ ] Email field is required, form does not submit without it

### Images
- [ ] No Next.js `sizes` prop console warnings on home page or product detail page

### Trust + Policy + Footer
- [ ] Trust bar shows 5 items in a row on desktop
- [ ] `/returns`, `/shipping`, `/privacy` pages render correctly
- [ ] Footer links to all three policy pages, WhatsApp, email

### SEO
- [ ] `/sitemap.xml` returns XML with all routes including product URLs
- [ ] `/robots.txt` disallows `/admin` and lists sitemap
- [ ] Product detail page source contains `<script type="application/ld+json">` with correct data

### Sales
- [ ] Admin can create, edit, activate, deactivate, and delete sales
- [ ] Only one sale can be active at a time
- [ ] Admin can add products to a sale with a sale price (auto-fills at 80%)
- [ ] `/sale` page shows active sale with countdown, stats, and product grid with OFF badges
- [ ] `/sale` returns 404 when no active sale
- [ ] Checkout shows flat sale delivery rate when sale is active
- [ ] Orders placed during active sale have `is_sale: true`
- [ ] Owner receives sale-specific email for sale orders
- [ ] Shop page excludes sale products when a sale is active
- [ ] Deactivating sale restores shop to normal, `/sale` returns 404

### Best sellers
- [ ] Admin can toggle "Best Seller" on any product
- [ ] "Most Loved" section appears on homepage only when at least one bestseller exists

### TypeScript
- [ ] `npx tsc --noEmit` passes with 0 errors after all tasks

---

## 18. Non-Goals

- No bulk variant stock import
- No variant-level pricing
- No low-stock alerts to admin
- No customer "notify me when back in stock"
- No stock history or audit log
- No changes to admin orders, invoices, payments pages
