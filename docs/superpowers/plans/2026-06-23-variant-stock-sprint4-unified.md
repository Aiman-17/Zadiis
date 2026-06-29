# Variant Stock + Sprint 4 Unified Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-variant (color × size) stock tracking with disabled sold-out UI, privacy trust message on reviews, mandatory checkout email, image size warnings fixed, plus full Sprint 4 (trust strip, policy pages, footer, SEO, admin sales management, public sale page with countdown, best sellers section, ProductCard sale badge).

**Architecture:** Single `variant_stock` JSONB column `{"Black": {"M": 5, "L": 2}}` as sole source of truth; `stock_quantity` stays as cached total recalculated by the updated `decrement_stock` RPC. Products with `variant_stock: {}` are legacy-compatible (no filtering applied). Sales system uses a `sales` + `sale_products` join table with a DB-enforced unique-active-sale constraint.

**Tech Stack:** Next.js App Router, Supabase (JSONB, RPC pl/pgsql), Tailwind CSS, TypeScript, Resend (email), lucide-react icons.

## Global Constraints

- Brand colors: `#1C1C1C` (black), `#A68B6E` (warm brown), `#E8DDD4` (border), `#FAF8F5` (bg)
- Font: `Playfair Display, serif` for headings — never change the hero section structure
- `export const dynamic = 'force-dynamic'` on all store pages that fetch from Supabase
- No new npm packages unless the task explicitly introduces one
- RPC function is named `decrement_stock` — never rename it
- Sentinel key `"_"` represents missing dimension (e.g. unstitched color-only products: `{"Navy": {"_": 10}}`)
- `variant_stock: {}` = legacy product, no per-variant filtering applied anywhere

---

## File Map

**New files:**
- `store/src/components/admin/VariantStockGrid.tsx` — shared component for both admin forms
- `store/src/app/(store)/returns/page.tsx`
- `store/src/app/(store)/shipping/page.tsx`
- `store/src/app/(store)/privacy/page.tsx`
- `store/src/app/sitemap.ts`
- `store/src/app/robots.ts`
- `store/src/app/api/admin/sales/route.ts`
- `store/src/app/api/admin/sales/[id]/route.ts`
- `store/src/app/api/admin/sales/[id]/products/route.ts`
- `store/src/app/admin/sales/page.tsx`
- `store/src/app/admin/sales/new/page.tsx`
- `store/src/app/admin/sales/[id]/edit/page.tsx`
- `store/src/app/(store)/sale/page.tsx`

**Modified files:**
- `store/src/types/index.ts` — add `variant_stock`, `is_bestseller`, `Sale`, `SaleProduct`; `Order.is_sale`
- `store/src/app/admin/products/[id]/edit/EditProductForm.tsx` — add VariantStockGrid + `is_bestseller`
- `store/src/app/admin/products/new/page.tsx` — add VariantStockGrid + `is_bestseller`
- `store/src/app/api/admin/products/route.ts` — pass `variant_stock`, `is_bestseller`
- `store/src/components/products/AddToCartButton.tsx` — variant-aware disabled logic
- `store/src/app/api/orders/route.ts` — new RPC params, `is_sale` flag, sale owner email, validate variant stock
- `store/src/app/api/payments/tracker/route.ts` — new RPC params, `is_sale` flag
- `store/src/components/products/ReviewForm.tsx` — privacy trust message
- `store/src/app/(store)/checkout/page.tsx` — email required, sale delivery override
- `store/src/components/products/ProductImageGallery.tsx` — add `sizes` prop
- `store/src/app/(store)/page.tsx` — add `sizes` to hero image, expand trust bar, add sale banner + best sellers
- `store/src/lib/products.ts` — add `getBestsellerProducts`, `getActiveSale`
- `store/src/components/products/ProductCard.tsx` — optional `salePrice` prop
- `store/src/app/layout.tsx` or root layout — OG metadata
- `store/src/app/(store)/shop/[slug]/page.tsx` — `generateMetadata` + JSON-LD
- `store/src/components/layout/Footer.tsx` (or wherever footer lives) — 3-column with policy links

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/sprint4_combined.sql` (run manually in Supabase SQL editor)

**Interfaces:**
- Produces: `products.variant_stock` JSONB, `products.is_bestseller` boolean, `orders.is_sale` boolean, `sales` table, `sale_products` table, updated `decrement_stock` RPC

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/sprint4_combined.sql`:

```sql
-- ============================================================
-- Sprint 4 Combined Migration
-- Run in Supabase SQL editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- 1. Products: variant stock JSONB + bestseller flag
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS variant_stock jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;

-- 2. Orders: sale flag
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS is_sale boolean NOT NULL DEFAULT false;

-- 3. Sales table
CREATE TABLE IF NOT EXISTS sales (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT false,
  delivery_charge_override integer,        -- NULL = keep zone charge; set to override flat rate
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Only one active sale at a time
CREATE UNIQUE INDEX IF NOT EXISTS sales_one_active
  ON sales (is_active)
  WHERE is_active = true;

-- 4. Sale products join
CREATE TABLE IF NOT EXISTS sale_products (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id    uuid NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sale_price integer NOT NULL,             -- PKR, overrides product.price during sale
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sale_id, product_id)
);

-- 5. Updated decrement_stock RPC
-- Adds optional p_color and p_size params.
-- If both are provided and variant_stock has data, decrements variant_stock[p_color][p_size].
-- Always decrements stock_quantity by p_quantity.
CREATE OR REPLACE FUNCTION decrement_stock(
  p_product_id uuid,
  p_quantity    integer,
  p_color       text DEFAULT '_',
  p_size        text DEFAULT '_'
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current jsonb;
  v_color   text;
  v_size    text;
  v_qty     integer;
BEGIN
  SELECT variant_stock INTO v_current
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  -- Only update variant_stock if it has data and valid keys passed
  IF v_current IS NOT NULL AND v_current <> '{}'::jsonb
     AND p_color <> '_' AND p_size <> '_' THEN
    v_qty := COALESCE((v_current -> p_color -> p_size)::integer, 0);
    IF v_qty >= p_quantity THEN
      UPDATE products
      SET variant_stock = jsonb_set(
            v_current,
            ARRAY[p_color, p_size],
            to_jsonb(v_qty - p_quantity)
          ),
          stock_quantity = GREATEST(0, stock_quantity - p_quantity)
      WHERE id = p_product_id;
      RETURN;
    END IF;
  END IF;

  -- Fallback: just decrement total
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$;
```

- [ ] **Step 2: Run migration in Supabase dashboard**

Go to Supabase Dashboard > SQL Editor > New query, paste the SQL, click Run.
Expected: "Success. No rows returned."

- [ ] **Step 3: Verify columns exist**

In Supabase Table Editor, open `products` — confirm `variant_stock` (jsonb, default `{}`) and `is_bestseller` (bool) appear.
Open `orders` — confirm `is_sale` (bool) column.
Confirm `sales` and `sale_products` tables exist.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/sprint4_combined.sql
git commit -m "feat: db migration — variant_stock, is_bestseller, sales tables, updated decrement_stock RPC"
```

---

## Task 2: TypeScript Types

**Files:**
- Modify: `store/src/types/index.ts`

**Interfaces:**
- Produces: `Product.variant_stock`, `Product.is_bestseller`, `Order.is_sale`, `Sale`, `SaleProduct` — consumed by all subsequent tasks

- [ ] **Step 1: Replace types/index.ts**

```typescript
// store/src/types/index.ts

export type Category = {
  id: string
  name: string
  slug: string
  is_active: boolean
}

// variant_stock shape: { [color: string]: { [size: string]: number } }
// Sentinel key "_" is used when dimension is absent (e.g. color-only product).
// Empty object {} means legacy product — no per-variant filtering applied.
export type VariantStock = Record<string, Record<string, number>>

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
  variant_stock: VariantStock
  is_bestseller: boolean
  sku?: string
  is_active: boolean
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
  is_sale: boolean
  safepay_tracker?: string
  safepay_transaction_id?: string
  payment_verified_at?: string
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
  is_active: boolean
  delivery_charge_override: number | null
  starts_at: string | null
  ends_at: string | null
  created_at: string
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

- [ ] **Step 2: Check for type errors**

```bash
cd store && npx tsc --noEmit 2>&1 | head -40
```

Expected: errors only in files that haven't been updated yet (AddToCartButton, admin forms). Zero errors from types/index.ts itself.

- [ ] **Step 3: Commit**

```bash
git add store/src/types/index.ts
git commit -m "feat: add variant_stock, is_bestseller, is_sale, Sale and SaleProduct types"
```

---

## Task 3: Admin Variant Stock + Bestseller

**Files:**
- Create: `store/src/components/admin/VariantStockGrid.tsx`
- Modify: `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- Modify: `store/src/app/admin/products/new/page.tsx`
- Modify: `store/src/app/api/admin/products/route.ts`

**Interfaces:**
- Consumes: `Product.variant_stock: VariantStock`, `Product.is_bestseller: boolean` from Task 2
- Produces: Updated admin PUT/POST bodies with `variant_stock` and `is_bestseller`

- [ ] **Step 1: Create VariantStockGrid component**

Create `store/src/components/admin/VariantStockGrid.tsx`:

```typescript
'use client'
import { Input } from '@/components/ui/input'
import type { VariantStock } from '@/types'

interface Props {
  colors: string[]
  sizes: string[]
  value: VariantStock
  onChange: (v: VariantStock) => void
}

export default function VariantStockGrid({ colors, sizes, value, onChange }: Props) {
  const effectiveSizes = sizes.length === 0 || (sizes.length === 1 && sizes[0] === 'Unstitched') ? ['_'] : sizes
  const effectiveColors = colors.length === 0 ? ['_'] : colors

  const get = (c: string, s: string) => value?.[c]?.[s] ?? 0

  const set = (c: string, s: string, qty: number) => {
    const next: VariantStock = JSON.parse(JSON.stringify(value || {}))
    if (!next[c]) next[c] = {}
    next[c][s] = Math.max(0, qty)
    onChange(next)
  }

  if (effectiveColors.length === 1 && effectiveColors[0] === '_' && effectiveSizes.length === 1 && effectiveSizes[0] === '_') {
    return (
      <div className="text-sm text-gray-500">Add colors or sizes above to enable per-variant stock</div>
    )
  }

  const showColorCol = !(effectiveColors.length === 1 && effectiveColors[0] === '_')
  const showSizeRow = !(effectiveSizes.length === 1 && effectiveSizes[0] === '_')

  return (
    <div className="overflow-x-auto">
      <table className="text-sm border-collapse w-full">
        <thead>
          <tr>
            {showColorCol && <th className="text-left pr-3 pb-2 font-medium text-gray-600">Color</th>}
            {showSizeRow
              ? effectiveSizes.map(s => (
                  <th key={s} className="px-2 pb-2 font-medium text-gray-600 text-center min-w-[64px]">{s}</th>
                ))
              : <th className="px-2 pb-2 font-medium text-gray-600 text-center min-w-[64px]">Qty</th>
            }
          </tr>
        </thead>
        <tbody>
          {effectiveColors.map(c => (
            <tr key={c}>
              {showColorCol && (
                <td className="pr-3 py-1 font-medium text-gray-700 capitalize">{c}</td>
              )}
              {effectiveSizes.map(s => (
                <td key={s} className="px-2 py-1">
                  <Input
                    type="number"
                    min="0"
                    value={get(c, s)}
                    onChange={e => set(c, s, Number(e.target.value))}
                    className="w-16 text-center h-8 text-sm"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Update EditProductForm.tsx**

Replace `store/src/app/admin/products/[id]/edit/EditProductForm.tsx` with:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUploader from '@/components/admin/ImageUploader'
import VariantStockGrid from '@/components/admin/VariantStockGrid'
import type { Product, Category, VariantStock } from '@/types'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unstitched']

export default function EditProductForm({ product, categories }: { product: Product; categories: Category[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku || '',
    description: product.description || '',
    price: String(product.price),
    stock_quantity: String(product.stock_quantity),
    images: [...product.images],
    colors: product.colors.join(', '),
    sizes: [...product.sizes],
    category_id: product.category_id || '',
    is_active: product.is_active,
    is_bestseller: product.is_bestseller ?? false,
    variant_stock: (product.variant_stock ?? {}) as VariantStock,
  })

  const set = (k: string, v: string | boolean | string[] | VariantStock) => setForm(f => ({ ...f, [k]: v }))

  const toggleSize = (s: string) => {
    if (s === 'Unstitched') {
      setForm(f => ({ ...f, sizes: f.sizes.includes('Unstitched') ? [] : ['Unstitched'] }))
    } else {
      setForm(f => ({
        ...f,
        sizes: f.sizes.includes(s)
          ? f.sizes.filter(x => x !== s)
          : [...f.sizes.filter(x => x !== 'Unstitched'), s],
      }))
    }
  }

  const parsedColors = form.colors.split(',').map(s => s.trim()).filter(Boolean)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: product.id,
        name: form.name,
        sku: form.sku || null,
        description: form.description,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        images: form.images,
        colors: parsedColors,
        sizes: form.sizes,
        category_id: form.category_id || null,
        is_active: form.is_active,
        is_bestseller: form.is_bestseller,
        variant_stock: form.variant_stock,
      }),
    })
    if (res.ok) {
      router.push('/admin/products')
      router.refresh()
    } else {
      alert('Failed to update product. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pname">Product Name *</Label>
            <Input id="pname" required value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="DRESS-BLK-M" className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea
            id="desc"
            className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price">Price (PKR) *</Label>
            <Input id="price" required type="number" min="0" value={form.price} onChange={e => set('price', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="stock">Total Stock (auto-calculated)</Label>
            <Input id="stock" type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="mt-1" />
            <p className="text-xs mt-1" style={{ color: '#A68B6E' }}>Use the variant grid below for per-size/color stock</p>
          </div>
        </div>
        {categories.length > 0 && (
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mt-1"
              style={{ borderColor: '#E2E8F0' }}
            >
              <option value="">— No category —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="block mb-2">Product Images</Label>
          <ImageUploader images={form.images} onChange={urls => set('images', urls)} />
        </div>
        <div>
          <Label htmlFor="colors">Colors (comma separated)</Label>
          <Input id="colors" value={form.colors} onChange={e => set('colors', e.target.value)} placeholder="Black, White, Navy Blue" className="mt-1" />
        </div>
        <div>
          <Label className="block mb-2">Sizes</Label>
          <div className="flex gap-2 flex-wrap items-center">
            {SIZES.filter(s => s !== 'Unstitched').map(s => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSize(s)}
                className="px-3 py-1 text-sm border rounded transition-colors"
                style={form.sizes.includes(s) ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' } : { borderColor: '#D1D5DB' }}
              >
                {s}
              </button>
            ))}
            <span className="text-gray-300 text-sm">|</span>
            <button
              type="button"
              onClick={() => toggleSize('Unstitched')}
              className="px-3 py-1 text-sm border rounded transition-colors"
              style={form.sizes.includes('Unstitched') ? { backgroundColor: '#A68B6E', color: 'white', borderColor: '#A68B6E' } : { borderColor: '#A68B6E', color: '#A68B6E' }}
            >
              Unstitched
            </button>
          </div>
          {form.sizes.includes('Unstitched') && (
            <p className="text-xs mt-1" style={{ color: '#A68B6E' }}>No size selection shown to customers</p>
          )}
        </div>

        {/* Variant Stock Grid */}
        <div>
          <Label className="block mb-2">Variant Stock</Label>
          <VariantStockGrid
            colors={parsedColors}
            sizes={form.sizes}
            value={form.variant_stock}
            onChange={v => set('variant_stock', v)}
          />
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_bestseller" checked={form.is_bestseller} onChange={e => set('is_bestseller', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_bestseller">Mark as Bestseller</Label>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_active">Active (visible in store)</Label>
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => router.push('/admin/products')}>Cancel</Button>
          <Button type="submit" disabled={loading} className="flex-1 text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? 'Saving...' : 'Update Product'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Update new product page**

Read `store/src/app/admin/products/new/page.tsx` and add the same three additions (VariantStockGrid import, `variant_stock` state, `is_bestseller` state) mirroring EditProductForm. The POST body must include `variant_stock: form.variant_stock` and `is_bestseller: form.is_bestseller`. Initial values: `variant_stock: {}`, `is_bestseller: false`.

- [ ] **Step 4: Update admin products API route**

`store/src/app/api/admin/products/route.ts` already passes `...body` to insert/update, so `variant_stock` and `is_bestseller` are automatically included when sent by the form. No change needed unless you see column rejection errors — in that case confirm the column names match exactly.

- [ ] **Step 5: Manual test**

Start dev server (`cd store && npm run dev`), navigate to `/admin/products`, open any product, confirm the Variant Stock grid appears below the Sizes section, enter some values, save, reopen — confirm values persist.

- [ ] **Step 6: Commit**

```bash
git add store/src/components/admin/VariantStockGrid.tsx \
        store/src/app/admin/products/[id]/edit/EditProductForm.tsx \
        store/src/app/admin/products/new/page.tsx
git commit -m "feat: variant stock grid + bestseller toggle in admin product forms"
```

---

## Task 4: Variant Stock Enforcement (AddToCartButton + Order APIs)

**Files:**
- Modify: `store/src/components/products/AddToCartButton.tsx`
- Modify: `store/src/app/api/orders/route.ts`
- Modify: `store/src/app/api/payments/tracker/route.ts`

**Interfaces:**
- Consumes: `Product.variant_stock: VariantStock` from Task 2
- Produces: Disabled size/color buttons for sold-out variants; RPC now receives `p_color` and `p_size`

- [ ] **Step 1: Replace AddToCartButton.tsx**

```typescript
'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/lib/cart-store'
import type { Product } from '@/types'

const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a', white: '#FFFFFF', beige: '#F5F0E8',
  'navy blue': '#003087', navy: '#003087', blue: '#3B82F6',
  'royal blue': '#4169E1', red: '#DC2626', maroon: '#800000',
  pink: '#EC4899', 'dusty rose': '#D4A5A5', blush: '#FFB6C1',
  mint: '#98FFB7', sage: '#9DC183', olive: '#808000',
  brown: '#A0522D', camel: '#C19A6B', grey: '#9CA3AF',
  gray: '#9CA3AF', cream: '#FFFDD0', 'off white': '#F8F6F0',
  gold: '#FFD700', silver: '#C0C0C0', purple: '#7C3AED',
  lavender: '#E6E6FA', coral: '#FF6B6B', teal: '#0D9488', green: '#16A34A',
}

function getColorHex(name: string) {
  return COLOR_MAP[name.toLowerCase()] ?? '#D1D5DB'
}

export default function AddToCartButton({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const hasSizes = product.sizes.length > 0 && !(product.sizes.length === 1 && product.sizes[0] === 'Unstitched')
  const hasTracking = Object.keys(product.variant_stock ?? {}).length > 0

  // For a given color, returns the stock qty for a size (or undefined if no tracking)
  const getVariantQty = (color: string, size: string): number | undefined => {
    if (!hasTracking) return undefined
    const c = color || '_'
    const s = size || '_'
    return product.variant_stock?.[c]?.[s]
  }

  // When a color is selected, determine which sizes are out of stock under that color
  const isSizeDisabled = (size: string): boolean => {
    if (!hasTracking) return false
    const c = selectedColor || '_'
    const qty = product.variant_stock?.[c]?.[size]
    return qty !== undefined && qty <= 0
  }

  // Determine which colors are completely out of stock (all sizes under that color are 0)
  const isColorDisabled = (color: string): boolean => {
    if (!hasTracking) return false
    const colorStock = product.variant_stock?.[color]
    if (!colorStock) return false
    return Object.values(colorStock).every(qty => qty <= 0)
  }

  // Compute available qty for currently selected variant
  const selectedVariantQty = useMemo(() => {
    if (!hasTracking) return product.stock_quantity
    const c = selectedColor || '_'
    const s = selectedSize || '_'
    const qty = product.variant_stock?.[c]?.[s]
    return qty !== undefined ? qty : product.stock_quantity
  }, [hasTracking, selectedColor, selectedSize, product])

  const handleAdd = () => {
    if (hasSizes && !selectedSize) { setError('Please select a size'); return }
    if (product.colors.length > 0 && !selectedColor) { setError('Please select a color'); return }
    if (hasTracking && selectedVariantQty <= 0) { setError('This combination is out of stock'); return }
    setError('')
    addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: product.images[0] || '',
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const totalOutOfStock = product.stock_quantity === 0

  return (
    <div className="space-y-4">
      {hasSizes && (
        <div>
          <p className="text-sm font-medium mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => {
              const disabled = isSizeDisabled(size)
              return (
                <button
                  key={size}
                  onClick={() => { if (!disabled) { setSelectedSize(size); setError('') } }}
                  disabled={disabled}
                  className="px-4 py-2 text-sm border rounded transition-colors relative"
                  style={
                    disabled
                      ? { borderColor: '#E8DDD4', color: '#D1D5DB', cursor: 'not-allowed', textDecoration: 'line-through' }
                      : selectedSize === size
                        ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
                        : { borderColor: '#E8DDD4' }
                  }
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {product.colors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Color
            {selectedColor && <span className="font-normal text-gray-500 ml-2">{selectedColor}</span>}
          </p>
          <div className="flex flex-wrap gap-3">
            {product.colors.map(color => {
              const disabled = isColorDisabled(color)
              return (
                <button
                  key={color}
                  onClick={() => { if (!disabled) { setSelectedColor(color); setSelectedSize(''); setError('') } }}
                  disabled={disabled}
                  title={disabled ? `${color} — sold out` : color}
                  className="w-8 h-8 rounded-full border-2 transition-all relative"
                  style={{
                    backgroundColor: getColorHex(color),
                    borderColor: selectedColor === color ? '#A68B6E' : '#E8DDD4',
                    boxShadow: selectedColor === color ? '0 0 0 2px #FAF8F5, 0 0 0 4px #A68B6E' : 'none',
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {disabled && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ fontSize: 16, color: '#999', lineHeight: 1 }}
                    >
                      ╲
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!totalOutOfStock && selectedVariantQty > 0 && selectedVariantQty <= 5 && (
        <p className="text-sm" style={{ color: '#B45309' }}>
          Only {selectedVariantQty} left in stock
        </p>
      )}

      {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}

      <Button
        onClick={handleAdd}
        disabled={totalOutOfStock || (hasTracking && selectedColor !== '' && selectedSize !== '' && selectedVariantQty <= 0)}
        className="w-full text-white rounded-none uppercase tracking-widest py-6 transition-colors"
        style={{ backgroundColor: added ? '#A68B6E' : '#1C1C1C' }}
      >
        {totalOutOfStock ? 'Sold Out' : added ? 'Added to Cart!' : 'Add to Cart'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Update orders/route.ts decrement loop**

In `store/src/app/api/orders/route.ts`, find the decrement loop (around line 86-91):

```typescript
    // Decrement stock for each item after order is confirmed
    for (const item of items as Array<{ product_id: string; quantity: number }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }
```

Replace with:

```typescript
    // Decrement stock for each item after order is confirmed
    for (const item of items as Array<{ product_id: string; quantity: number; color?: string; size?: string }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_color: item.color || '_',
        p_size: item.size || '_',
      })
    }
```

- [ ] **Step 3: Update tracker/route.ts decrement loop**

In `store/src/app/api/payments/tracker/route.ts`, find the decrement loop (around line 130-132):

```typescript
    for (const item of items as Array<{ product_id: string; quantity: number }>) {
      await supabaseAdmin.rpc('decrement_stock', { p_product_id: item.product_id, p_quantity: item.quantity })
    }
```

Replace with:

```typescript
    for (const item of items as Array<{ product_id: string; quantity: number; color?: string; size?: string }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
        p_color: item.color || '_',
        p_size: item.size || '_',
      })
    }
```

- [ ] **Step 4: Type-check**

```bash
cd store && npx tsc --noEmit 2>&1 | head -30
```

Expected: Zero errors.

- [ ] **Step 5: Manual test**

In admin, set a product to have `variant_stock: {"Black": {"M": 0, "L": 5}, "White": {"M": 3, "L": 0}}`. Go to that product's detail page. Select Black — M should show strikethrough/disabled, L available. Select White — M available, L disabled.

- [ ] **Step 6: Commit**

```bash
git add store/src/components/products/AddToCartButton.tsx \
        store/src/app/api/orders/route.ts \
        store/src/app/api/payments/tracker/route.ts
git commit -m "feat: per-variant stock enforcement — disabled UI + RPC color/size params"
```

---

## Task 5: Quick Fixes (Review Privacy, Checkout Email, Image Sizes)

**Files:**
- Modify: `store/src/components/products/ReviewForm.tsx`
- Modify: `store/src/app/(store)/checkout/page.tsx`
- Modify: `store/src/components/products/ProductImageGallery.tsx`
- Modify: `store/src/app/(store)/page.tsx`

**Interfaces:**
- None (standalone visual/UX fixes)

- [ ] **Step 1: Add privacy trust message to ReviewForm**

In `store/src/components/products/ReviewForm.tsx`, find the Submit Review button (line ~85) and add the privacy message AFTER the button:

```typescript
      <Button
        type="submit"
        disabled={submitting}
        className="w-full text-white rounded-none text-sm"
        style={{ backgroundColor: '#1C1C1C' }}
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>

      <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
        🔒 Your privacy matters to us. We only display your name and review — your personal information is never shared.
      </p>
```

- [ ] **Step 2: Make checkout email mandatory**

In `store/src/app/(store)/checkout/page.tsx`, find the email field (around line 214-216):

```typescript
        <div>
          <Label htmlFor="email">Email (optional — for order updates)</Label>
          <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
        </div>
```

Replace with:

```typescript
        <div>
          <Label htmlFor="email">Email * (for order confirmation & updates)</Label>
          <Input id="email" required type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
        </div>
```

Also update `buildPayload` (line ~55-66): change `customer_email: form.email || null` to `customer_email: form.email`:

```typescript
  const buildPayload = () => ({
    customer_name: form.name,
    customer_phone: form.phone,
    customer_email: form.email,
    address: form.address,
    city: form.city,
    items: items.map(i => ({ product_id: i.id, product_name: i.name, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, price: i.price })),
    subtotal,
    delivery_charge: deliveryCharge,
    total,
    payment_method: form.payment,
  })
```

Also in `orders/route.ts`, update the required fields check to include `customer_email`:

```typescript
    if (!customer_name || !customer_phone || !customer_email || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
```

- [ ] **Step 3: Fix Image sizes prop in ProductImageGallery.tsx**

In `store/src/components/products/ProductImageGallery.tsx`, line 26 (main image):

```typescript
          <Image src={images[active]} alt={name} fill className="object-cover" />
```

Replace with:

```typescript
          <Image src={images[active]} alt={name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
```

Line 50 (thumbnails inside the map):

```typescript
                <Image src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" />
```

Replace with:

```typescript
                <Image src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" sizes="25vw" />
```

- [ ] **Step 4: Fix Image sizes prop in hero (page.tsx)**

In `store/src/app/(store)/page.tsx`, find the hero Image (around line 36-40):

```typescript
          <Image
            src={heroImage}
            alt="ZADIIS Hero Banner"
            fill
            className="object-cover"
            priority
          />
```

Replace with:

```typescript
          <Image
            src={heroImage}
            alt="ZADIIS Hero Banner"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
```

- [ ] **Step 5: Verify no console warnings**

Start dev server, visit a product detail page and the home page. Open browser console — confirm no "Image with src ... is missing sizes prop" warnings.

- [ ] **Step 6: Commit**

```bash
git add store/src/components/products/ReviewForm.tsx \
        store/src/app/\(store\)/checkout/page.tsx \
        store/src/components/products/ProductImageGallery.tsx \
        store/src/app/\(store\)/page.tsx \
        store/src/app/api/orders/route.ts
git commit -m "fix: review privacy message, mandatory email at checkout, image sizes warnings"
```

---

## Task 6: Trust Strip Expansion + Policy Pages + Footer

**Files:**
- Modify: `store/src/app/(store)/page.tsx` — expand trust bar
- Create: `store/src/app/(store)/returns/page.tsx`
- Create: `store/src/app/(store)/shipping/page.tsx`
- Create: `store/src/app/(store)/privacy/page.tsx`
- Modify footer component (find path with `grep -r "footer" store/src/components --include="*.tsx" -l`)

**Interfaces:**
- None

- [ ] **Step 1: Expand trust bar in page.tsx**

Find the Trust Bar section in `store/src/app/(store)/page.tsx` and replace:

```typescript
      {/* Trust Bar */}
      <section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} style={{ color: '#A68B6E' }} /> Free delivery over PKR 10,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} style={{ color: '#A68B6E' }} /> Easy returns</div>
          <div className="flex items-center gap-2"><Shield size={18} style={{ color: '#A68B6E' }} /> Secure payments</div>
        </div>
      </section>
```

With (add `Lock` and `Star` to the existing Truck/RefreshCw/Shield import):

```typescript
      {/* Trust Bar */}
      <section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} style={{ color: '#A68B6E' }} /> Free delivery over PKR 10,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} style={{ color: '#A68B6E' }} /> Easy 7-day returns</div>
          <div className="flex items-center gap-2"><Shield size={18} style={{ color: '#A68B6E' }} /> Secure payments</div>
          <div className="flex items-center gap-2"><Lock size={18} style={{ color: '#A68B6E' }} /> 100% authentic products</div>
          <div className="flex items-center gap-2"><Star size={18} style={{ color: '#A68B6E' }} /> 500+ happy customers</div>
        </div>
      </section>
```

Update the import at the top of page.tsx:

```typescript
import { Truck, RefreshCw, Shield, Lock, Star } from 'lucide-react'
```

- [ ] **Step 2: Create returns page**

Create `store/src/app/(store)/returns/page.tsx`:

```typescript
export const metadata = { title: 'Returns & Exchanges | ZADIIS' }

export default function ReturnsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Returns & Exchanges</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>7-Day Return Policy</h2>
          <p>We accept returns within 7 days of delivery. Items must be unworn, unwashed, and in original packaging with all tags attached.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>How to Return</h2>
          <ol className="list-decimal list-inside space-y-1">
            <li>WhatsApp us your order number and reason for return</li>
            <li>We will confirm your return request within 24 hours</li>
            <li>Ship the item back to our address (provided on confirmation)</li>
            <li>Refund or exchange is processed within 3–5 business days of receiving the item</li>
          </ol>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Non-Returnable Items</h2>
          <p>Sale items, customised orders, and items marked as final sale cannot be returned.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Contact</h2>
          <p>For any return queries, please WhatsApp us or email <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create shipping page**

Create `store/src/app/(store)/shipping/page.tsx`:

```typescript
export const metadata = { title: 'Shipping Information | ZADIIS' }

export default function ShippingPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Shipping Information</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Delivery Times</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Karachi: 1–2 business days</li>
            <li>Lahore, Islamabad: 2–3 business days</li>
            <li>Other major cities: 3–5 business days</li>
          </ul>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Delivery Charges</h2>
          <p>Delivery charges vary by city and are shown at checkout. Free delivery is available on orders over PKR 10,000.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Tracking Your Order</h2>
          <p>Once your order is dispatched, you will receive a tracking number via email or WhatsApp.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Questions?</h2>
          <p>Contact us on WhatsApp or email <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create privacy page**

Create `store/src/app/(store)/privacy/page.tsx`:

```typescript
export const metadata = { title: 'Privacy Policy | ZADIIS' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Privacy Policy</h1>
      <div className="prose prose-sm max-w-none space-y-6 text-gray-700">
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Information We Collect</h2>
          <p>We collect your name, phone number, email address, and delivery address when you place an order. This information is used solely to process and deliver your order.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Reviews</h2>
          <p>When you submit a product review, only your name and review content are displayed publicly. Your email address and contact details are never shared.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Data Sharing</h2>
          <p>We do not sell or share your personal information with third parties except as required to fulfill your order (e.g., delivery partners).</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#1C1C1C' }}>Contact</h2>
          <p>For privacy concerns, email us at <a href="mailto:support@zadiis.com" className="underline">support@zadiis.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update Footer with policy links**

First, find the footer file:

```bash
grep -r "footer\|Footer" store/src/components --include="*.tsx" -l
grep -r "footer\|Footer" store/src/app --include="*.tsx" -l
```

Open the footer file. Add three columns. The exact replacement depends on the current structure, but the target output is:

```typescript
<footer style={{ backgroundColor: '#1C1C1C', color: '#E8DDD4' }} className="py-12 mt-auto">
  <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
    {/* Brand */}
    <div>
      <p className="text-lg font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif', color: 'white' }}>ZADIIS</p>
      <p className="text-sm" style={{ color: '#9CA3AF' }}>Dressed in Confidence. Women&apos;s fashion crafted for the modern Pakistani woman.</p>
    </div>
    {/* Quick Links */}
    <div>
      <p className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: '#A68B6E' }}>Quick Links</p>
      <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
        <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
        <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
        <li><Link href="/sale" className="hover:text-white transition-colors">Sale</Link></li>
      </ul>
    </div>
    {/* Policies */}
    <div>
      <p className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: '#A68B6E' }}>Policies</p>
      <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
        <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
        <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
        <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
      </ul>
    </div>
  </div>
  <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t text-center text-xs" style={{ borderColor: '#374151', color: '#6B7280' }}>
    © {new Date().getFullYear()} ZADIIS. All rights reserved.
  </div>
</footer>
```

Import `Link` from `'next/link'` in the footer file if not already there.

- [ ] **Step 6: Commit**

```bash
git add store/src/app/\(store\)/page.tsx \
        store/src/app/\(store\)/returns/page.tsx \
        store/src/app/\(store\)/shipping/page.tsx \
        store/src/app/\(store\)/privacy/page.tsx
git add -A store/src/components/layout/ store/src/app/layout.tsx 2>/dev/null || true
git commit -m "feat: 5-item trust strip, policy pages, 3-column footer with policy links"
```

---

## Task 7: SEO — OG Metadata, Sitemap, Robots, Product generateMetadata + JSON-LD

**Files:**
- Modify: `store/src/app/layout.tsx` — default OG metadata
- Create: `store/src/app/sitemap.ts`
- Create: `store/src/app/robots.ts`
- Modify: `store/src/app/(store)/shop/[slug]/page.tsx` — `generateMetadata` + JSON-LD

**Interfaces:**
- None

- [ ] **Step 1: Add default OG metadata to root layout**

Read `store/src/app/layout.tsx`. Find the existing `export const metadata` (or add one if absent) and replace/add:

```typescript
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'ZADIIS — Women\'s Fashion',
    template: '%s | ZADIIS',
  },
  description: 'Discover women\'s fashion crafted for the modern Pakistani woman. Shop dresses, suits, and more.',
  openGraph: {
    siteName: 'ZADIIS',
    type: 'website',
    locale: 'en_PK',
  },
  twitter: {
    card: 'summary_large_image',
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'),
}
```

- [ ] **Step 2: Create sitemap.ts**

Create `store/src/app/sitemap.ts`:

```typescript
import { supabaseAdmin } from '@/lib/supabase/server'
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: products } = await supabaseAdmin
    .from('products')
    .select('slug, updated_at')
    .eq('is_active', true)

  const productUrls = (products ?? []).map(p => ({
    url: `${BASE_URL}/shop/${p.slug}`,
    lastModified: new Date(p.updated_at || Date.now()),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/sale`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.7 },
    { url: `${BASE_URL}/returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/shipping`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.2 },
    ...productUrls,
  ]
}
```

- [ ] **Step 3: Create robots.ts**

Create `store/src/app/robots.ts`:

```typescript
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/order/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Add generateMetadata + JSON-LD to product detail page**

Read `store/src/app/(store)/shop/[slug]/page.tsx`. Add `generateMetadata` export and JSON-LD script block. The file already has `export default async function ProductPage`. Add before it:

```typescript
import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('name, description, images, price, slug')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!product) return { title: 'Product Not Found' }

  return {
    title: product.name,
    description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADIIS`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADIIS`,
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
      type: 'website',
      url: `${BASE_URL}/shop/${product.slug}`,
    },
  }
}
```

Inside the `ProductPage` component JSX, add a JSON-LD script tag at the top of the return:

```typescript
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.images,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: product.price,
      availability: product.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/shop/${product.slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* existing JSX */}
    </>
  )
```

- [ ] **Step 5: Verify sitemap and robots**

Start dev server, visit `http://localhost:3000/sitemap.xml` — confirm product URLs appear.
Visit `http://localhost:3000/robots.txt` — confirm admin/api are disallowed.

- [ ] **Step 6: Commit**

```bash
git add store/src/app/layout.tsx \
        store/src/app/sitemap.ts \
        store/src/app/robots.ts \
        store/src/app/\(store\)/shop/\[slug\]/page.tsx
git commit -m "feat: OG metadata, sitemap.xml, robots.txt, product generateMetadata + JSON-LD"
```

---

## Task 8: Admin Sales Management (CRUD)

**Files:**
- Create: `store/src/app/api/admin/sales/route.ts`
- Create: `store/src/app/api/admin/sales/[id]/route.ts`
- Create: `store/src/app/api/admin/sales/[id]/products/route.ts`
- Create: `store/src/app/admin/sales/page.tsx`
- Create: `store/src/app/admin/sales/new/page.tsx`
- Create: `store/src/app/admin/sales/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `Sale`, `SaleProduct` types from Task 2
- Produces: REST CRUD for sales; admin UI pages; sale activation with DB unique constraint enforcement

- [ ] **Step 1: Create sales API routes**

Create `store/src/app/api/admin/sales/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(*, products(id, name, slug, price, images))')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, is_active, delivery_charge_override, starts_at, ends_at } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('sales')
    .insert([{ title, description: description || null, is_active: is_active ?? false, delivery_charge_override: delivery_charge_override ?? null, starts_at: starts_at || null, ends_at: ends_at || null }])
    .select()
    .single()
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return NextResponse.json({ error: 'Another sale is already active. Deactivate it first.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
```

Create `store/src/app/api/admin/sales/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { title, description, is_active, delivery_charge_override, starts_at, ends_at } = body
  const { error } = await supabaseAdmin
    .from('sales')
    .update({ title, description: description || null, is_active: is_active ?? false, delivery_charge_override: delivery_charge_override ?? null, starts_at: starts_at || null, ends_at: ends_at || null })
    .eq('id', params.id)
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return NextResponse.json({ error: 'Another sale is already active. Deactivate it first.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await supabaseAdmin.from('sales').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

Create `store/src/app/api/admin/sales/[id]/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { product_id, sale_price } = await req.json()
  if (!product_id || !sale_price) return NextResponse.json({ error: 'product_id and sale_price required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('sale_products')
    .upsert([{ sale_id: params.id, product_id, sale_price }], { onConflict: 'sale_id,product_id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { product_id } = await req.json()
  const { error } = await supabaseAdmin
    .from('sale_products')
    .delete()
    .eq('sale_id', params.id)
    .eq('product_id', product_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create admin sales list page**

Create `store/src/app/admin/sales/page.tsx`:

```typescript
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Sale } from '@/types'

export default async function AdminSalesPage() {
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Sales</h1>
        <Button asChild className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/admin/sales/new">+ New Sale</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {(sales as Sale[] ?? []).map(sale => (
          <div key={sale.id} className="flex items-center justify-between p-4 bg-white border rounded-lg" style={{ borderColor: '#E8DDD4' }}>
            <div>
              <p className="font-medium">{sale.title}</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {sale.is_active ? '🟢 Active' : '⚫ Inactive'}
                {sale.delivery_charge_override != null && ` · Delivery override: PKR ${sale.delivery_charge_override}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link href={`/admin/sales/${sale.id}/edit`}>Edit</Link>
              </Button>
            </div>
          </div>
        ))}
        {(!sales || sales.length === 0) && (
          <p className="text-gray-400 text-sm">No sales yet. Create one to get started.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create admin new sale page**

Create `store/src/app/admin/sales/new/page.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', is_active: false, delivery_charge_override: '', starts_at: '', ends_at: '' })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        is_active: form.is_active,
        delivery_charge_override: form.delivery_charge_override ? Number(form.delivery_charge_override) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to create sale'); setLoading(false); return }
    router.push(`/admin/sales/${data.id}/edit`)
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div>
          <Label htmlFor="title">Sale Title *</Label>
          <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Eid Sale 2026" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" style={{ borderColor: '#E2E8F0' }} placeholder="Up to 40% off on selected items" />
        </div>
        <div>
          <Label htmlFor="delivery">Delivery Charge Override (PKR, optional)</Label>
          <Input id="delivery" type="number" min="0" value={form.delivery_charge_override} onChange={e => set('delivery_charge_override', e.target.value)} placeholder="Leave blank to keep zone pricing" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Starts At</Label>
            <Input id="starts" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ends">Ends At</Label>
            <Input id="ends" type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_active">Activate immediately</Label>
        </div>
        {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => router.push('/admin/sales')}>Cancel</Button>
          <Button type="submit" disabled={loading} className="flex-1 text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? 'Creating...' : 'Create Sale'}
          </Button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Create admin sale edit page (with product management)**

Create `store/src/app/admin/sales/[id]/edit/page.tsx`:

```typescript
'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Sale, SaleProduct, Product } from '@/types'

export default function EditSalePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sale, setSale] = useState<Sale | null>(null)
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [addProductId, setAddProductId] = useState('')
  const [addSalePrice, setAddSalePrice] = useState('')
  const [form, setForm] = useState({ title: '', description: '', is_active: false, delivery_charge_override: '', starts_at: '', ends_at: '' })

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/sales')
    const data = await res.json()
    const found = (data as (Sale & { sale_products: SaleProduct[] })[]).find(s => s.id === params.id)
    if (found) {
      setSale(found)
      setSaleProducts(found.sale_products || [])
      setForm({
        title: found.title,
        description: found.description || '',
        is_active: found.is_active,
        delivery_charge_override: found.delivery_charge_override != null ? String(found.delivery_charge_override) : '',
        starts_at: found.starts_at ? found.starts_at.slice(0, 16) : '',
        ends_at: found.ends_at ? found.ends_at.slice(0, 16) : '',
      })
    }
    const pRes = await fetch('/api/admin/products')
    const pData = await pRes.json()
    setAllProducts(pData as Product[])
  }, [params.id])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/sales/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        is_active: form.is_active,
        delivery_charge_override: form.delivery_charge_override ? Number(form.delivery_charge_override) : null,
        starts_at: form.starts_at || null,
        ends_at: form.ends_at || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to update'); setLoading(false); return }
    setLoading(false)
    alert('Saved!')
  }

  const handleDelete = async () => {
    if (!confirm('Delete this sale? This cannot be undone.')) return
    await fetch(`/api/admin/sales/${params.id}`, { method: 'DELETE' })
    router.push('/admin/sales')
  }

  const handleAddProduct = async () => {
    if (!addProductId || !addSalePrice) return
    const res = await fetch(`/api/admin/sales/${params.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: addProductId, sale_price: Number(addSalePrice) }),
    })
    if (res.ok) { setAddProductId(''); setAddSalePrice(''); load() }
  }

  const handleRemoveProduct = async (productId: string) => {
    await fetch(`/api/admin/sales/${params.id}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    load()
  }

  if (!sale) return <div className="p-4">Loading...</div>

  const addedProductIds = new Set(saleProducts.map(sp => sp.product_id))
  const availableProducts = allProducts.filter(p => !addedProductIds.has(p.id))

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Sale</h1>

      {/* Sale settings */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div>
          <Label htmlFor="title">Sale Title *</Label>
          <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2} className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" style={{ borderColor: '#E2E8F0' }} />
        </div>
        <div>
          <Label htmlFor="delivery">Delivery Charge Override (PKR, optional)</Label>
          <Input id="delivery" type="number" min="0" value={form.delivery_charge_override} onChange={e => set('delivery_charge_override', e.target.value)} placeholder="Leave blank to keep zone pricing" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="starts">Starts At</Label>
            <Input id="starts" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="ends">Ends At</Label>
            <Input id="ends" type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_active">Active</Label>
        </div>
        {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1 text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" className="rounded-none" style={{ borderColor: '#DC2626', color: '#DC2626' }} onClick={handleDelete}>
            Delete Sale
          </Button>
        </div>
      </form>

      {/* Products in this sale */}
      <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Products in this Sale</h2>

        {/* Add product */}
        <div className="flex gap-2 mb-4">
          <select
            value={addProductId}
            onChange={e => setAddProductId(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="">Select product to add...</option>
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>{p.name} (PKR {p.price})</option>
            ))}
          </select>
          <Input type="number" placeholder="Sale price" value={addSalePrice} onChange={e => setAddSalePrice(e.target.value)} className="w-32" min="0" />
          <Button type="button" onClick={handleAddProduct} className="text-white rounded-none" style={{ backgroundColor: '#A68B6E' }}>Add</Button>
        </div>

        {/* Product list */}
        <div className="space-y-2">
          {saleProducts.map(sp => {
            const product = allProducts.find(p => p.id === sp.product_id)
            return (
              <div key={sp.id} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#F3F4F6' }}>
                <div>
                  <p className="text-sm font-medium">{product?.name || sp.product_id}</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    Original: PKR {product?.price.toLocaleString()} → Sale: PKR {sp.sale_price.toLocaleString()}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-none text-xs" style={{ borderColor: '#FCA5A5', color: '#B91C1C' }} onClick={() => handleRemoveProduct(sp.product_id)}>
                  Remove
                </Button>
              </div>
            )
          })}
          {saleProducts.length === 0 && <p className="text-sm text-gray-400">No products added yet.</p>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Add admin products GET endpoint**

The edit page above fetches `/api/admin/products` with GET. Add a GET handler to `store/src/app/api/admin/products/route.ts`:

```typescript
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price, images')
    .eq('is_active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
```

- [ ] **Step 6: Add "Sales" nav link in admin sidebar**

Find the admin sidebar/nav file. Add:

```typescript
<Link href="/admin/sales">Sales</Link>
```

alongside the existing Products, Orders, etc. links.

- [ ] **Step 7: Commit**

```bash
git add store/src/app/api/admin/sales/ \
        store/src/app/admin/sales/ \
        store/src/app/api/admin/products/route.ts
git commit -m "feat: admin sales management — CRUD, product-per-sale, activate/deactivate"
```

---

## Task 9: Sale API + Delivery Override + Checkout Sale Logic + Owner Email

**Files:**
- Create: `store/src/app/api/sale/route.ts`
- Modify: `store/src/app/api/delivery-zones/route.ts`
- Modify: `store/src/app/(store)/checkout/page.tsx` — consume sale data at checkout
- Modify: `store/src/app/api/orders/route.ts` — set `is_sale`, call `sendOwnerSaleOrder`
- Modify: `store/src/app/api/payments/tracker/route.ts` — set `is_sale`
- Modify: `store/src/lib/email.ts` — add `sendOwnerSaleOrder`

**Interfaces:**
- Consumes: `Sale` type from Task 2
- Produces: `/api/sale` endpoint, sale delivery override at checkout, `is_sale` flag on orders, sale owner email

- [ ] **Step 1: Create public sale API**

Create `store/src/app/api/sale/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data: sale, error } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(product_id, sale_price, products(id, name, slug, price, images, colors, sizes, stock_quantity, variant_stock, is_bestseller, sku, is_active, created_at, category_id, description))')
    .eq('is_active', true)
    .single()

  if (error || !sale) return NextResponse.json({ sale: null }, { status: 200 })
  return NextResponse.json({ sale })
}
```

- [ ] **Step 2: Update delivery-zones route to include sale info**

In `store/src/app/api/delivery-zones/route.ts`, add sale data to the response:

```typescript
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const [zonesRes, settingsRes, saleRes] = await Promise.all([
    supabaseAdmin.from('delivery_zones').select('*').eq('is_active', true).order('city'),
    supabaseAdmin.from('store_settings').select('key, value').in('key', ['cod_enabled']),
    supabaseAdmin.from('sales').select('id, delivery_charge_override').eq('is_active', true).single(),
  ])

  const settings = Object.fromEntries((settingsRes.data || []).map(r => [r.key, r.value]))
  const activeSale = saleRes.data

  return NextResponse.json({
    zones: zonesRes.data || [],
    cod_enabled: settings.cod_enabled === 'true',
    sale_active: !!activeSale,
    sale_delivery_override: activeSale?.delivery_charge_override ?? null,
  })
}
```

- [ ] **Step 3: Update checkout page to apply sale delivery override**

In `store/src/app/(store)/checkout/page.tsx`:

1. Update the `fetch('/api/delivery-zones')` response destructuring (around line 36-40):

```typescript
    fetch('/api/delivery-zones')
      .then(r => r.json())
      .then(({ zones, cod_enabled, sale_active, sale_delivery_override }: { zones: DeliveryZone[]; cod_enabled: boolean; sale_active: boolean; sale_delivery_override: number | null }) => {
        setZones(zones)
        setCodEnabled(cod_enabled)
        setSaleActive(sale_active)
        setSaleDeliveryOverride(sale_delivery_override)
      })
```

2. Add two state variables near the top of the component:

```typescript
  const [saleActive, setSaleActive] = useState(false)
  const [saleDeliveryOverride, setSaleDeliveryOverride] = useState<number | null>(null)
```

3. Update `handleCityChange`:

```typescript
  const handleCityChange = (city: string) => {
    set('city', city)
    const zone = zones.find(z => z.city === city)
    const baseCharge = zone?.delivery_charge ?? 0
    setDeliveryCharge(saleDeliveryOverride !== null ? saleDeliveryOverride : baseCharge)
  }
```

4. Add `is_sale: saleActive` to `buildPayload`:

```typescript
  const buildPayload = () => ({
    customer_name: form.name,
    customer_phone: form.phone,
    customer_email: form.email,
    address: form.address,
    city: form.city,
    items: items.map(i => ({ product_id: i.id, product_name: i.name, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, price: i.price })),
    subtotal,
    delivery_charge: deliveryCharge,
    total,
    payment_method: form.payment,
    is_sale: saleActive,
  })
```

- [ ] **Step 4: Add sendOwnerSaleOrder to email.ts**

Read `store/src/lib/email.ts` to see the existing `sendOwnerNewOrder` signature and helpers. Add a new function at the bottom that sends a slightly different subject line to indicate it's a sale order:

```typescript
export async function sendOwnerSaleOrder(params: Parameters<typeof sendOwnerNewOrder>[0]) {
  // Identical to sendOwnerNewOrder but with SALE marker in subject.
  // Reuse the same email body — just override the subject.
  return sendOwnerNewOrder({ ...params, _subjectPrefix: '🛍️ SALE ORDER' })
}
```

If `sendOwnerNewOrder` doesn't support `_subjectPrefix`, use a copy approach — duplicate the function body changing the subject to `🛍️ SALE ORDER — ${order_number}`. After reading the actual `email.ts` implementation, adapt accordingly.

- [ ] **Step 5: Update orders/route.ts to set is_sale + send sale email**

In `store/src/app/api/orders/route.ts`:

1. Import `sendOwnerSaleOrder`:

```typescript
import { sendOwnerNewOrder, sendCustomerOrderConfirmed, sendOwnerSaleOrder } from '@/lib/email'
```

2. Destructure `is_sale` from body (line ~24):

```typescript
    const {
      customer_name, customer_phone, customer_email,
      address, city, items, subtotal, delivery_charge, total, payment_method, is_sale,
    } = body
```

3. Add `is_sale` to the insert (line ~61):

```typescript
        .insert([{
          order_number,
          customer_name,
          customer_phone,
          customer_email: customer_email ?? null,
          address,
          city,
          items,
          subtotal: subtotal ?? total,
          delivery_charge: delivery_charge ?? 0,
          total,
          payment_method,
          is_sale: is_sale ?? false,
        }])
```

4. After `sendOwnerNewOrder`, add conditional sale email:

```typescript
    if (order.is_sale) {
      await sendOwnerSaleOrder({
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        customer_email: order.customer_email,
        address: order.address,
        city: order.city,
        items: order.items,
        subtotal: order.subtotal,
        delivery_charge: order.delivery_charge,
        total: order.total,
        payment_method: order.payment_method,
        payment_status: order.payment_status ?? 'pending',
      })
    }
```

- [ ] **Step 6: Update tracker/route.ts similarly**

Mirror Step 5 changes in `tracker/route.ts` — destructure `is_sale`, include in insert, call `sendOwnerSaleOrder` conditionally.

- [ ] **Step 7: Commit**

```bash
git add store/src/app/api/sale/ \
        store/src/app/api/delivery-zones/route.ts \
        store/src/app/\(store\)/checkout/page.tsx \
        store/src/app/api/orders/route.ts \
        store/src/app/api/payments/tracker/route.ts \
        store/src/lib/email.ts
git commit -m "feat: sale API, delivery override at checkout, is_sale flag, sale owner email"
```

---

## Task 10: Sale Store Page + Homepage Sale Banner + Best Sellers + ProductCard Sale Badge

**Files:**
- Create: `store/src/app/(store)/sale/page.tsx`
- Modify: `store/src/components/products/ProductCard.tsx` — optional `salePrice` prop
- Modify: `store/src/lib/products.ts` — add `getBestsellerProducts`
- Modify: `store/src/app/(store)/page.tsx` — sale banner + best sellers section

**Interfaces:**
- Consumes: `/api/sale` endpoint from Task 9; `getBestsellerProducts` from lib/products
- Produces: `/sale` page with countdown; homepage sale banner + best sellers below New Arrivals

- [ ] **Step 1: Update ProductCard with optional salePrice**

Read `store/src/components/products/ProductCard.tsx` first. Add `salePrice?: number` prop. When present, show the sale price prominently and original price struck through:

```typescript
interface ProductCardProps {
  product: Product
  salePrice?: number
}

export default function ProductCard({ product, salePrice }: ProductCardProps) {
  // ... existing code ...

  // In the price section, replace the existing price display with:
  // <div className="flex items-baseline gap-2">
  //   {salePrice ? (
  //     <>
  //       <span className="font-semibold" style={{ color: '#DC2626' }}>PKR {salePrice.toLocaleString()}</span>
  //       <span className="text-sm line-through" style={{ color: '#9CA3AF' }}>PKR {product.price.toLocaleString()}</span>
  //     </>
  //   ) : (
  //     <span className="font-semibold">PKR {product.price.toLocaleString()}</span>
  //   )}
  // </div>
}
```

Read the actual file first to find the exact price line, then make the targeted edit.

- [ ] **Step 2: Add getBestsellerProducts to lib/products.ts**

Append to `store/src/lib/products.ts`:

```typescript
export async function getBestsellerProducts(limit = 6) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_bestseller', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Product[]
}
```

- [ ] **Step 3: Create sale page**

Create `store/src/app/(store)/sale/page.tsx`:

```typescript
import { supabaseAdmin } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import SaleCountdown from '@/components/products/SaleCountdown'
import type { Sale, SaleProduct, Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SalePage() {
  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(product_id, sale_price, products(*))')
    .eq('is_active', true)
    .single()

  if (!sale) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>No Active Sale</h1>
        <p className="text-gray-500">Check back soon for our next sale event!</p>
      </div>
    )
  }

  const saleProducts = (sale.sale_products ?? []) as (SaleProduct & { products: Product })[]

  return (
    <div>
      {/* Sale header */}
      <div className="text-center py-12 px-4" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#A68B6E' }}>Limited Time</p>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{(sale as Sale).title}</h1>
        {(sale as Sale).description && (
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">{(sale as Sale).description}</p>
        )}
        {(sale as Sale).ends_at && (
          <SaleCountdown endsAt={(sale as Sale).ends_at!} />
        )}
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {saleProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {saleProducts.map(sp => (
              <ProductCard key={sp.product_id} product={sp.products} salePrice={sp.sale_price} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Sale products coming soon.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create SaleCountdown component**

Create `store/src/components/products/SaleCountdown.tsx`:

```typescript
'use client'
import { useState, useEffect } from 'react'

export default function SaleCountdown({ endsAt }: { endsAt: string }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false })

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ hours: 0, minutes: 0, seconds: 0, expired: true }); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft({ hours: h, minutes: m, seconds: s, expired: false })
    }
    calc()
    const id = setInterval(calc, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (timeLeft.expired) return <p className="text-sm" style={{ color: '#A68B6E' }}>Sale has ended</p>

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center justify-center gap-3 text-white">
      <span className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E' }}>Ends in</span>
      <div className="flex gap-2">
        {[{ v: timeLeft.hours, l: 'h' }, { v: timeLeft.minutes, l: 'm' }, { v: timeLeft.seconds, l: 's' }].map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center">
            <span className="text-2xl font-bold tabular-nums">{pad(v)}</span>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Add sale banner + best sellers to homepage**

In `store/src/app/(store)/page.tsx`:

1. Add imports:

```typescript
import { getBestsellerProducts } from '@/lib/products'
```

2. Update the data fetching in `HomePage`:

```typescript
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let bestSellers: Awaited<ReturnType<typeof getBestsellerProducts>> = []
  let heroImage = ''
  let activeSale: { title: string; description: string | null; ends_at: string | null } | null = null
  try {
    const [featuredData, bestSellersData, heroData, saleData] = await Promise.all([
      getFeaturedProducts(6),
      getBestsellerProducts(6),
      getHeroImage(),
      supabaseAdmin
        .from('sales')
        .select('title, description, ends_at')
        .eq('is_active', true)
        .single()
        .then(r => r.data),
    ])
    featured = featuredData
    bestSellers = bestSellersData
    heroImage = heroData
    activeSale = saleData
  } catch {
    // Supabase not configured yet — show empty state
  }
```

3. After the Trust Bar section and before the Featured Products section, add the sale banner:

```typescript
      {/* Sale Banner — only shown when a sale is active */}
      {activeSale && (
        <section className="py-6 px-4 text-center" style={{ backgroundColor: '#A68B6E' }}>
          <Link href="/sale" className="group inline-block">
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: '#FAF8F5', opacity: 0.8 }}>Limited Time Offer</p>
            <p className="text-xl font-semibold text-white" style={{ fontFamily: 'Playfair Display, serif' }}>
              {activeSale.title} — <span className="underline group-hover:no-underline">Shop the Sale →</span>
            </p>
          </Link>
        </section>
      )}
```

4. After the Featured Products section, add best sellers:

```typescript
      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16" style={{ borderTop: '1px solid #E8DDD4' }}>
          <h2 className="text-2xl md:text-3xl text-center mb-10" style={{ fontFamily: 'Playfair Display, serif' }}>Best Sellers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {bestSellers.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
```

- [ ] **Step 6: Type-check and build**

```bash
cd store && npx tsc --noEmit 2>&1 | head -30
```

Expected: Zero errors.

```bash
cd store && npm run build 2>&1 | tail -20
```

Expected: "✓ Compiled successfully" or similar.

- [ ] **Step 7: End-to-end test**

1. In admin, create a new sale with a title and end date 1 hour from now. Mark it active. Add 2 products with discounted sale prices.
2. Visit `http://localhost:3000/sale` — confirm sale header, countdown timer counting down, products showing with red discounted price.
3. Visit `http://localhost:3000` — confirm sale banner appears below the trust bar.
4. Add a sale product to cart, checkout — confirm delivery shows overridden charge if set.
5. Deactivate the sale in admin — refresh homepage and `/sale` — banner gone, sale page shows "No Active Sale".

- [ ] **Step 8: Commit**

```bash
git add store/src/app/\(store\)/sale/ \
        store/src/components/products/SaleCountdown.tsx \
        store/src/components/products/ProductCard.tsx \
        store/src/lib/products.ts \
        store/src/app/\(store\)/page.tsx
git commit -m "feat: sale store page with countdown, homepage sale banner + best sellers, ProductCard sale badge"
```

---

## PHR

After completing all tasks, create the Prompt History Record at `history/prompts/general/`.
