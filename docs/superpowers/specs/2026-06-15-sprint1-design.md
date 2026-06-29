# Sprint 1 Design — ZADIIS Store Polish
**Date:** 2026-06-15
**Status:** Approved
**Project:** ZADIIS Women's Fashion Ecommerce (Pakistan)

---

## Scope

Five focused improvements to make the store production-ready for launch:

1. Image upload to Supabase Storage (with compression + quality preview)
2. SKU field on products
3. Short order number (#ZD-XXXX)
4. Order confirmation page redesign
5. Delivery charge system + admin settings page

**Out of scope (Sprint 2):** Safepay gateway integration, COD courier integration (Leopard/TCS), customer accounts.

---

## 1. Database Changes

### New table: `delivery_zones`
```sql
create table delivery_zones (
  id uuid default gen_random_uuid() primary key,
  city text not null unique,
  delivery_charge decimal(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Seed
insert into delivery_zones (city, delivery_charge) values ('Karachi', 200);
```

### Modify `products` table
```sql
alter table products add column sku text unique;
```

### Modify `orders` table
```sql
alter table orders add column order_number text unique;
alter table orders add column delivery_charge decimal(10,2) not null default 0;
```

Order total formula: `subtotal + delivery_charge = total`

### Supabase Storage bucket
- Bucket name: `product-images`
- Access: public read
- Path pattern: `products/{product-id}/{timestamp}.jpg`

---

## 2. Image Upload System

### Location
Admin Add Product + Edit Product forms — upload button sits above the existing image URL textarea (textarea kept as fallback).

### Flow
1. Admin clicks "Upload Images" → file picker opens (accepts jpg, png, webp)
2. Browser reads file → shows instant preview with dimensions + file size
3. Browser compresses automatically (canvas API, no library needed):
   - Max width: 1200px (height scales proportionally)
   - Quality: 80% JPEG
   - Typical result: 150–300KB per image
4. If image width < 800px → show warning: "Image too small — may look blurry on product page"
5. Admin clicks "Upload" → file goes directly to Supabase Storage
6. Public URL returned → appended to product's `images[]` array
7. Up to 8 images per product

### Components
- `ImageUploader.tsx` — client component, handles compression + preview + upload
- Sits inside `ProductForm` (shared by new + edit pages)

### No migration needed
Existing products with URL-based images continue to work unchanged.

---

## 3. SKU Field

### Product form
- New text input: "SKU" (e.g. `LAWN-BLK-M`)
- Optional field — not required to save product
- Validated as unique on submit (Supabase unique constraint handles this)
- Displayed in: admin products list, admin orders list, order confirmation page

### Purpose
When a customer WhatsApps about an order, both owner and customer can reference the SKU instead of describing "the black one with flowers."

---

## 4. Short Order Number

### Format
`ZD-` + 4-digit zero-padded sequential number → `ZD-1001`, `ZD-1002`, `ZD-1003`

### Generation
On order creation in `/api/orders`:
1. Query `max(order_number)` from orders table
2. Parse the numeric part, increment by 1
3. Start from `ZD-1001` if no orders exist
4. Insert order with generated `order_number`

### Race condition handling
Supabase unique constraint on `order_number` — if two simultaneous orders generate the same number, one will fail and retry. Acceptable at current scale.

### Display
- Order confirmation page: large, prominent
- Admin orders list: primary identifier column (replaces UUID display)
- Owner email notification: subject line includes order number

---

## 5. Order Confirmation Page Redesign

### Layout
```
[ ✓ Order Placed! ]

┌─────────────────────────────────────┐
│  ZADIIS                             │
│  Order #ZD-1042  ·  15 June 2026   │
│                                     │
│  Items:                             │
│  Black Lawn Suit (LAWN-BLK-M) × 1  │
│  ................................  PKR 3,500  │
│                                     │
│  Subtotal ..................  PKR 3,500  │
│  Delivery ..................    PKR 200  │
│  Total .....................  PKR 3,700  │
│                                     │
│  Payment: JazzCash                  │
│  Deliver to: House 12, Karachi      │
└─────────────────────────────────────┘

[ payment_status = pending ]
"Screenshot this page and send it to our
WhatsApp along with any questions about your order"
[ WhatsApp Button → pre-filled: "Hi! Order #ZD-1042 from ZADIIS" ]

[ payment_status = paid ]  ← Sprint 2 activates this
"✓ Payment confirmed. Your order is being processed."
[ WhatsApp Button → support contact ]

[ Continue Shopping → /shop ]
```

### payment_status logic
- Default on order creation: `pending`
- Sprint 2: Safepay webhook sets to `paid` automatically
- Page reads `payment_status` from order and renders correct message
- No redesign needed in Sprint 2 — just the webhook flip

---

## 6. Delivery Charge System

### Admin Settings page (`/admin/settings`)

**Delivery Zones panel:**
- Table: City | Charge (PKR) | Status | Actions
- Add city: text input + charge input + Save button
- Per-row: edit charge inline at any time, toggle active/inactive, delete
- Inactive cities hidden from checkout city dropdown
- Karachi PKR 200 is only a starting default — change it anytime from this panel, no code change or redeployment needed

**Payments panel:**
- COD toggle (on/off)
- When ON: COD option appears in checkout
- When OFF: COD hidden (current state)
- Stored in `store_settings` table: `key = 'cod_enabled'`, `value = 'true' | 'false'`

### Checkout changes
- City dropdown fetches from `delivery_zones` where `is_active = true`
- On city select: delivery charge shown immediately below
- Order summary updates: Subtotal + Delivery = Total
- `delivery_charge` sent in order POST body

### Cart page
- "Shipping: Calculated at checkout" stays as-is (city not known yet)

---

## 7. Files to Create / Modify

### New files
- `src/components/admin/ImageUploader.tsx`
- `src/app/admin/settings/page.tsx`
- `store/supabase/migrations/sprint1.sql`

### Modified files
- `src/app/admin/products/new/page.tsx` — add SKU field + ImageUploader
- `src/app/admin/products/[id]/edit/EditProductForm.tsx` — add SKU + ImageUploader
- `src/app/admin/products/page.tsx` — add SKU column
- `src/app/admin/orders/page.tsx` — show order_number instead of UUID
- `src/app/admin/layout.tsx` — add Settings nav link
- `src/app/(store)/checkout/page.tsx` — dynamic cities, delivery charge, COD toggle
- `src/app/(store)/order/[id]/page.tsx` — full redesign
- `src/app/api/orders/route.ts` — generate order_number, include delivery_charge
- `src/types/index.ts` — update Product and Order types

---

## 8. Acceptance Criteria

- [ ] Admin can upload images from laptop/phone — sees preview + compressed size before uploading
- [ ] Images under 800px wide show a warning
- [ ] SKU field saves and displays in admin products list
- [ ] Every new order gets a unique `#ZD-XXXX` number
- [ ] Order confirmation page shows card with order number, SKU, items, delivery charge, total
- [ ] WhatsApp button pre-fills order number in message
- [ ] Checkout city dropdown pulls live from `delivery_zones` table
- [ ] Selecting a city shows its delivery charge, updates total
- [ ] Admin settings page: add/remove cities, set charges, toggle COD
- [ ] COD toggle works: appears/disappears in checkout without redeployment
- [ ] `payment_status = paid` shows confirmed message (ready for Sprint 2 webhook)

---

## 9. Out of Scope

- Safepay gateway redirect + webhook (Sprint 2)
- Customer accounts / login
- COD courier integration (Leopard/TCS)
- Inventory transaction log (Sprint 2)
- PDF invoice generation
- Discount/promo codes
