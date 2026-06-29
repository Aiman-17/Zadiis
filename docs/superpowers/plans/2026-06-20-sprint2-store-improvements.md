# Sprint 2 — Store Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add stock management, hero banner CMS, image zoom, customer reviews, admin notifications, order filters/delete, and improved dashboard charts to the live ZADIIS store.

**Architecture:** Next.js 16 App Router with Supabase PostgreSQL. All new APIs use `supabaseAdmin` (service role) for server routes. Client components use browser supabase only for realtime. No new dependencies — reuse existing Recharts, Lucide, Tailwind, shadcn/ui patterns.

**Tech Stack:** Next.js 16.2.7, TypeScript, Tailwind CSS v4, Supabase, Recharts, Lucide icons. Brand colors: bg=#FAF8F5, text=#1C1C1C, accent=#A68B6E, border=#E8DDD4. No arbitrary Tailwind color classes — use inline style for brand colors.

---

## Codebase Context (read before every task)

- Working directory: `store/` (all paths below are relative to this)
- `src/lib/supabase/server.ts` exports `supabaseAdmin` (service role, server-only)
- `src/lib/supabase/client.ts` exports `supabase` (anon, browser)
- `src/types/index.ts` — shared types: Product, Order, OrderItem, DeliveryZone
- `src/app/api/admin/orders/route.ts` — existing GET/PUT for orders
- `src/app/api/orders/route.ts` — existing POST creates orders
- `src/app/admin/settings/page.tsx` — existing settings page (COD toggle + delivery zones)
- `src/components/products/ProductImageGallery.tsx` — existing image gallery
- `src/components/products/AddToCartButton.tsx` — existing add to cart
- `src/app/(store)/checkout/page.tsx` — existing checkout page
- `src/app/(store)/page.tsx` — home page with hero section
- `src/app/admin/layout.tsx` — admin layout with sidebar nav
- `src/app/admin/orders/page.tsx` — admin orders list
- `src/components/admin/DashboardCharts.tsx` — existing Recharts dashboard
- `supabase/schema.sql` — add all migrations here too for reference

---

## File Structure

**New files:**
- `supabase/sprint2.sql` — DB migration: reviews table
- `src/app/api/products/[id]/reviews/route.ts` — GET/POST reviews
- `src/app/api/admin/orders/[id]/route.ts` — DELETE single order
- `src/components/products/StarRating.tsx` — reusable star rating display
- `src/components/products/ReviewForm.tsx` — customer review submission
- `src/components/products/ReviewList.tsx` — display reviews list

**Modified files:**
- `src/types/index.ts` — add Review type
- `src/app/api/orders/route.ts` — decrement stock on order creation, validate stock
- `src/app/(store)/checkout/page.tsx` — show out-of-stock error before submit
- `src/app/(store)/page.tsx` — fetch + display hero banner from settings
- `src/app/(store)/shop/[slug]/page.tsx` — add ReviewForm + ReviewList
- `src/components/products/ProductImageGallery.tsx` — add fullscreen zoom modal
- `src/app/admin/settings/page.tsx` — add hero banner image upload
- `src/app/admin/orders/page.tsx` — add time filters + delete button
- `src/app/admin/layout.tsx` — add order notification badge (polling)
- `src/app/admin/page.tsx` — add yearly revenue stat card
- `src/components/admin/DashboardCharts.tsx` — add yearly chart + % change

---

## Task 1: Database Migration — Reviews Table

**Files:**
- Create: `supabase/sprint2.sql`
- Modify: `supabase/schema.sql` (append migration)

- [ ] **Step 1: Create migration file**

```sql
-- supabase/sprint2.sql

-- Reviews table for product reviews (no login required)
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read reviews" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages reviews" ON reviews
  USING (auth.role() = 'service_role');
```

- [ ] **Step 2: Run in Supabase dashboard**

Go to **Supabase → SQL Editor → New Query** → paste the SQL above → click **Run**.

Expected: "Success. No rows returned."

- [ ] **Step 3: Append to schema.sql for reference**

Append the same SQL block to `supabase/schema.sql` with a `-- Sprint 2` comment header.

- [ ] **Step 4: Commit**

```bash
git add supabase/sprint2.sql supabase/schema.sql
git commit -m "feat: add reviews table with RLS policies"
```

---

## Task 2: Add Review Type to Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add Review type at the end of the file**

```typescript
export type Review = {
  id: string
  product_id: string
  customer_name: string
  rating: number
  comment: string | null
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Review type"
```

---

## Task 3: Stock Decrement on Order + Checkout Validation

**Files:**
- Modify: `src/app/api/orders/route.ts`
- Modify: `src/app/(store)/checkout/page.tsx`

- [ ] **Step 1: Update orders POST API to decrement stock and validate**

In `src/app/api/orders/route.ts`, after the `if (!customer_name || ...)` validation block and before the order insert loop, add stock validation. Then after the order is created, decrement stock.

Replace the entire file content with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function generateOrderNumber(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .not('order_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let next = 1001
  if (data?.order_number) {
    const match = (data.order_number as string).match(/ZD-(\d+)/)
    if (match) next = parseInt(match[1]) + 1
  }
  return `ZD-${next}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customer_name, customer_phone, customer_email,
      address, city, items, subtotal, delivery_charge, total, payment_method,
    } = body

    if (!customer_name || !customer_phone || !address || !city || !payment_method || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate stock for all items before creating order
    for (const item of items as Array<{ product_id: string; product_name: string; quantity: number }>) {
      const { data: product, error } = await supabaseAdmin
        .from('products')
        .select('stock_quantity, name')
        .eq('id', item.product_id)
        .single()

      if (error || !product) {
        return NextResponse.json({ error: `Product not found: ${item.product_name}` }, { status: 400 })
      }
      if (product.stock_quantity < item.quantity) {
        return NextResponse.json({
          error: `Sorry, "${item.product_name}" is out of stock or has insufficient quantity. Available: ${product.stock_quantity}.`,
          outOfStock: true,
        }, { status: 400 })
      }
    }

    let order = null
    let insertError = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const order_number = await generateOrderNumber()
      const { data, error } = await supabaseAdmin
        .from('orders')
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
        }])
        .select()
        .single()
      if (!error) { order = data; break }
      if (!error?.message?.includes('unique')) { insertError = error; break }
      insertError = error
    }

    if (!order) {
      console.error('DB insert error:', insertError)
      return NextResponse.json({ error: insertError?.message ?? 'Failed to create order' }, { status: 500 })
    }

    // Decrement stock for each item after order is confirmed
    for (const item of items as Array<{ product_id: string; quantity: number }>) {
      await supabaseAdmin.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }

    const itemRows = (order.items as Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>)
      .map(i => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;color:#1C1C1C">
            ${i.product_name}${i.sku ? `<br><span style="font-size:12px;color:#A68B6E">${i.sku}</span>` : ''}
            <br><span style="font-size:12px;color:#888">${i.size} · ${i.color}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:center;color:#1C1C1C">×${i.quantity}</td>
          <td style="padding:10px 0;border-bottom:1px solid #F0EAE3;text-align:right;color:#1C1C1C">PKR ${Number(i.price * i.quantity).toLocaleString()}</td>
        </tr>`)
      .join('')

    const ownerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">New Order — ${order.order_number}</h2>
        <p><strong>Customer:</strong> ${order.customer_name} · ${order.customer_phone}</p>
        <p><strong>Email:</strong> ${order.customer_email ?? '—'}</p>
        <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
        <p><strong>Payment:</strong> ${order.payment_method}</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}</table>
        <p><strong>Subtotal:</strong> PKR ${Number(order.subtotal).toLocaleString()}</p>
        <p><strong>Delivery:</strong> PKR ${Number(order.delivery_charge).toLocaleString()}</p>
        <p style="font-size:1.1em;color:#A68B6E"><strong>Total: PKR ${Number(order.total).toLocaleString()}</strong></p>
      </div>`

    const customerHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#FAF8F5;padding:0">
        <div style="background:#1C1C1C;padding:28px 32px;text-align:center">
          <h1 style="color:white;font-family:Georgia,serif;margin:0;font-size:28px;letter-spacing:4px">ZADIIS</h1>
          <p style="color:#A68B6E;margin:6px 0 0;font-size:13px;letter-spacing:1px">Modern Pakistani Women's Fashion</p>
        </div>
        <div style="padding:32px;background:#FAF8F5">
          <h2 style="color:#1C1C1C;font-family:Georgia,serif;margin:0 0 8px">Order Confirmed!</h2>
          <p style="color:#666;margin:0 0 24px">Thank you ${order.customer_name}, your order has been placed successfully.</p>
          <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px;text-align:center">
            <p style="margin:0;font-size:12px;color:#888;letter-spacing:1px;text-transform:uppercase">Order Number</p>
            <p style="margin:6px 0 0;font-size:24px;font-weight:bold;color:#A68B6E;font-family:Georgia,serif">${order.order_number}</p>
          </div>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">${itemRows}</table>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr><td style="padding:6px 0;color:#666">Subtotal</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(order.subtotal).toLocaleString()}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Delivery</td><td style="padding:6px 0;text-align:right;color:#1C1C1C">PKR ${Number(order.delivery_charge).toLocaleString()}</td></tr>
            <tr style="border-top:2px solid #E8DDD4"><td style="padding:10px 0;font-weight:bold;color:#1C1C1C">Total</td><td style="padding:10px 0;text-align:right;font-weight:bold;font-size:1.1em;color:#A68B6E">PKR ${Number(order.total).toLocaleString()}</td></tr>
          </table>
          <div style="background:white;border:1px solid #E8DDD4;border-radius:8px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0 0 8px;font-weight:bold;color:#1C1C1C">Delivery Address</p>
            <p style="margin:0;color:#666">${order.address}, ${order.city}</p>
          </div>
          ${order.payment_method === 'cod'
            ? `<div style="background:#FEF9EC;border:1px solid #F5D87A;border-radius:8px;padding:16px 20px;margin-bottom:24px"><p style="margin:0;color:#92640A;font-weight:bold">Cash on Delivery</p><p style="margin:6px 0 0;color:#92640A;font-size:14px">Please keep PKR ${Number(order.total).toLocaleString()} ready at the time of delivery.</p></div>`
            : `<div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:8px;padding:16px 20px;margin-bottom:24px"><p style="margin:0;color:#166534;font-weight:bold">Online Payment</p><p style="margin:6px 0 0;color:#166534;font-size:14px">Once your payment is confirmed, your order will be processed immediately.</p></div>`}
          <div style="text-align:center;margin-bottom:8px">
            <a href="https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi!%20I%20need%20help%20with%20my%20order%20${order.order_number}" style="display:inline-block;background:#25D366;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px">WhatsApp Support</a>
            <p style="margin:8px 0 0;font-size:12px;color:#888">Questions? Chat with us on WhatsApp</p>
          </div>
        </div>
        <div style="background:#1C1C1C;padding:20px 32px;text-align:center">
          <p style="color:#888;margin:0;font-size:12px">© 2026 ZADIIS. All rights reserved.</p>
          <p style="color:#666;margin:6px 0 0;font-size:11px">zadiis.com.pk</p>
        </div>
      </div>`

    try {
      await resend.emails.send({
        from: 'ZADIIS <orders@zadiis.com.pk>',
        to: process.env.OWNER_EMAIL!,
        subject: `New Order ${order.order_number} — PKR ${Number(order.total).toLocaleString()}`,
        html: ownerHtml,
      })
      if (order.customer_email) {
        await resend.emails.send({
          from: 'ZADIIS <orders@zadiis.com.pk>',
          to: order.customer_email,
          subject: `Order Confirmed — ${order.order_number} | ZADIIS`,
          html: customerHtml,
        })
      }
    } catch (emailError) {
      console.error('Email send failed:', emailError)
    }

    return NextResponse.json({ orderId: order.id }, { status: 201 })
  } catch (err) {
    console.error('Orders API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create the decrement_stock Supabase function**

In **Supabase → SQL Editor → New Query**, run:

```sql
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id uuid, p_quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(0, stock_quantity - p_quantity)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Expected: "Success. No rows returned."

- [ ] **Step 3: Add out-of-stock error display in checkout page**

In `src/app/(store)/checkout/page.tsx`, find the `handleSubmit` function and update it to handle `outOfStock` errors. Find the existing error state and the submit button area. Add this error display just above the submit button:

Find this pattern in checkout page (the submit button section) and make the `handleSubmit` show the API error message directly in the UI. The checkout page already has an `error` state. Update `handleSubmit` to:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!city) { setError('Please select a delivery city'); return }
  setLoading(true)
  setError('')
  try {
    const orderItems = cart.map(i => ({
      product_id: i.id,
      product_name: i.name,
      sku: i.sku,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      price: i.price,
    }))
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.name,
        customer_phone: form.phone,
        customer_email: form.email || null,
        address: form.address,
        city,
        items: orderItems,
        subtotal,
        delivery_charge: deliveryCharge,
        total,
        payment_method: paymentMethod,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }
    clearCart()
    window.dispatchEvent(new Event('cart-updated'))
    router.push(`/order/${data.orderId}`)
  } catch {
    setError('Connection error. Please try again.')
    setLoading(false)
  }
}
```

Note: Read `src/app/(store)/checkout/page.tsx` first to find the exact current handleSubmit and replace only that function.

- [ ] **Step 4: Build and verify**

```bash
npm run build
```

Expected: Clean build, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/orders/route.ts src/app/(store)/checkout/page.tsx
git commit -m "feat: stock validation and decrement on order placement"
```

---

## Task 4: Hero Banner CMS — Admin Upload + Home Page Display

**Files:**
- Modify: `src/app/admin/settings/page.tsx`
- Modify: `src/app/(store)/page.tsx`
- Modify: `src/app/api/admin/settings/route.ts` (verify it handles `hero_image` key — it already does generic key/value)

- [ ] **Step 1: Add hero banner upload section to admin settings page**

Read `src/app/admin/settings/page.tsx` first. Add hero banner upload at the top of the returned JSX, before the Delivery Zones section. Add `heroImage` and `heroUploading` state. Add `uploadHero` function.

Add these state variables to the existing component state:
```typescript
const [heroImage, setHeroImage] = useState('')
const [heroUploading, setHeroUploading] = useState(false)
```

In the existing `useEffect`, add fetching hero_image:
```typescript
fetch('/api/admin/settings')
  .then(r => r.json())
  .then((s: Record<string, string>) => {
    setCodEnabled(s.cod_enabled === 'true')
    setHeroImage(s.hero_image || '')
  })
```

Add `uploadHero` function before the return:
```typescript
const uploadHero = async (file: File) => {
  setHeroUploading(true)
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
  if (res.ok) {
    const { url } = await res.json()
    setHeroImage(url)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'hero_image', value: url }),
    })
  }
  setHeroUploading(false)
}
```

Add this section at the top of the returned `<div className="max-w-2xl space-y-8">`, before the Delivery Zones card:
```tsx
{/* Hero Banner */}
<div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
  <h2 className="font-semibold mb-4">Hero Banner Image</h2>
  {heroImage && (
    <div className="relative w-full aspect-video rounded overflow-hidden mb-4 bg-gray-100">
      <img src={heroImage} alt="Hero banner" className="w-full h-full object-cover" />
    </div>
  )}
  <label className="flex items-center gap-2 border-2 border-dashed rounded px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors" style={{ borderColor: '#E8DDD4', color: '#A68B6E' }}>
    <input
      type="file"
      accept="image/*"
      className="hidden"
      onChange={e => e.target.files?.[0] && uploadHero(e.target.files[0])}
    />
    {heroUploading ? 'Uploading...' : heroImage ? 'Replace Banner Image' : 'Upload Banner Image'}
  </label>
  {heroImage && (
    <button
      onClick={async () => {
        setHeroImage('')
        await fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'hero_image', value: '' }),
        })
      }}
      className="mt-2 text-xs text-red-400 hover:text-red-600"
    >
      Remove banner
    </button>
  )}
</div>
```

- [ ] **Step 2: Update home page to fetch and display hero banner**

Replace `src/app/(store)/page.tsx` hero section with dynamic image support:

```typescript
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/products/ProductCard'
import { getFeaturedProducts } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Truck, RefreshCw, Shield } from 'lucide-react'

async function getHeroImage(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'hero_image')
      .single()
    return data?.value || ''
  } catch {
    return ''
  }
}

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let heroImage = ''
  try {
    ;[featured, heroImage] = await Promise.all([getFeaturedProducts(6), getHeroImage()])
  } catch {
    // Supabase not configured yet
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center text-center overflow-hidden" style={{ minHeight: '85vh', backgroundColor: '#E8DDD4' }}>
        {heroImage && (
          <Image
            src={heroImage}
            alt="ZADIIS Hero Banner"
            fill
            className="object-cover"
            priority
          />
        )}
        <div className="relative z-10 px-4" style={heroImage ? { backgroundColor: 'rgba(0,0,0,0.3)', padding: '40px 32px', borderRadius: '8px' } : {}}>
          <p className="text-sm uppercase tracking-widest mb-4" style={{ color: heroImage ? '#F5DEB3' : '#A68B6E', letterSpacing: '0.3em' }}>New Collection</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif', color: heroImage ? 'white' : 'inherit' }}>
            Dressed in<br />Confidence
          </h1>
          <p className="mb-8 max-w-md mx-auto" style={{ color: heroImage ? '#E5E7EB' : '#4B5563' }}>
            Discover women&apos;s fashion crafted for the modern Pakistani woman.
          </p>
          <Button asChild size="lg" className="text-white px-10 rounded-none uppercase tracking-widest text-sm" style={{ backgroundColor: '#1C1C1C' }}>
            <Link href="/shop">Shop Now</Link>
          </Button>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} style={{ color: '#A68B6E' }} /> Free delivery over PKR 10,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} style={{ color: '#A68B6E' }} /> Easy returns</div>
          <div className="flex items-center gap-2"><Shield size={18} style={{ color: '#A68B6E' }} /> Secure payments</div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl text-center mb-10" style={{ fontFamily: 'Playfair Display, serif' }}>New Arrivals</h2>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Products coming soon.</p>
        )}
        <div className="text-center mt-10">
          <Button asChild variant="outline" className="rounded-none uppercase tracking-widest text-sm px-10" style={{ borderColor: '#1C1C1C' }}>
            <Link href="/shop">View All</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/settings/page.tsx src/app/(store)/page.tsx
git commit -m "feat: hero banner CMS — upload in admin settings, display on home page"
```

---

## Task 5: Product Image Zoom / Fullscreen Modal

**Files:**
- Modify: `src/components/products/ProductImageGallery.tsx`

- [ ] **Step 1: Replace ProductImageGallery with zoom support**

```typescript
'use client'
import { useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'

export default function ProductImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0)
  const [zoomed, setZoomed] = useState(false)

  if (!images.length) {
    return (
      <div className="aspect-[3/4] rounded-lg bg-gray-100 flex items-center justify-center">
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        <div
          className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white cursor-zoom-in group"
          onClick={() => setZoomed(true)}
        >
          <Image src={images[active]} alt={name} fill className="object-cover" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <div className="bg-white rounded-full p-2 shadow">
              <ZoomIn size={20} style={{ color: '#1C1C1C' }} />
            </div>
          </div>
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className="aspect-square relative rounded overflow-hidden bg-white transition-all"
                style={{
                  outline: active === i ? '2px solid #A68B6E' : '2px solid transparent',
                  outlineOffset: '2px',
                }}
              >
                <Image src={img} alt={`${name} view ${i + 1}`} fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          onClick={() => setZoomed(false)}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 z-10"
            onClick={() => setZoomed(false)}
          >
            <X size={24} />
          </button>
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={e => { e.stopPropagation(); setActive(i) }}
                  className="w-2 h-2 rounded-full transition-colors"
                  style={{ backgroundColor: active === i ? '#A68B6E' : 'rgba(255,255,255,0.4)' }}
                />
              ))}
            </div>
          )}
          <div
            className="relative w-full h-full max-w-3xl max-h-[90vh] mx-4"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={images[active]}
              alt={name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 800px"
            />
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/products/ProductImageGallery.tsx
git commit -m "feat: product image fullscreen zoom modal"
```

---

## Task 6: Customer Reviews — API + Components + Product Page

**Files:**
- Create: `src/app/api/products/[id]/reviews/route.ts`
- Create: `src/components/products/StarRating.tsx`
- Create: `src/components/products/ReviewForm.tsx`
- Create: `src/components/products/ReviewList.tsx`
- Modify: `src/app/(store)/shop/[slug]/page.tsx`

- [ ] **Step 1: Create reviews API route**

Create `src/app/api/products/[id]/reviews/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .eq('product_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { customer_name, rating, comment } = body

  if (!customer_name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: 'Rating must be 1-5' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert([{ product_id: id, customer_name: customer_name.trim(), rating, comment: comment?.trim() || null }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create StarRating component**

Create `src/components/products/StarRating.tsx`:

```typescript
export default function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <svg key={star} width={size} height={size} viewBox="0 0 24 24" fill={star <= rating ? '#A68B6E' : 'none'} stroke="#A68B6E" strokeWidth="1.5">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create ReviewForm component**

Create `src/components/products/ReviewForm.tsx`:

```typescript
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Review } from '@/types'

export default function ReviewForm({ productId, onSubmitted }: { productId: string; onSubmitted: (r: Review) => void }) {
  const [name, setName] = useState('')
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('Please enter your name'); return }
    if (!rating) { setError('Please select a star rating'); return }
    setSubmitting(true)
    setError('')
    const res = await fetch(`/api/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer_name: name, rating, comment }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to submit'); setSubmitting(false); return }
    onSubmitted(data)
    setDone(true)
    setSubmitting(false)
  }

  if (done) {
    return (
      <div className="border rounded-lg p-4 text-center text-sm" style={{ borderColor: '#E8DDD4', color: '#A68B6E' }}>
        Thank you for your review!
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-3" style={{ borderColor: '#E8DDD4' }}>
      <p className="font-medium text-sm">Write a Review</p>

      {/* Star picker */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => { setRating(star); setError('') }}
          >
            <svg width={28} height={28} viewBox="0 0 24 24" fill={star <= (hovered || rating) ? '#A68B6E' : 'none'} stroke="#A68B6E" strokeWidth="1.5" className="transition-colors">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
      </div>

      <Input
        placeholder="Your name"
        value={name}
        onChange={e => { setName(e.target.value); setError('') }}
        className="text-sm"
      />
      <textarea
        placeholder="Share your experience (optional)"
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
        className="w-full border rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1"
        style={{ borderColor: '#E8DDD4' }}
      />
      {error && <p className="text-xs" style={{ color: '#B91C1C' }}>{error}</p>}
      <Button type="submit" disabled={submitting} className="w-full text-white rounded-none text-sm" style={{ backgroundColor: '#1C1C1C' }}>
        {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 4: Create ReviewList component**

Create `src/components/products/ReviewList.tsx`:

```typescript
import StarRating from './StarRating'
import type { Review } from '@/types'

export default function ReviewList({ reviews }: { reviews: Review[] }) {
  if (!reviews.length) {
    return <p className="text-sm text-gray-400 text-center py-4">No reviews yet. Be the first!</p>
  }

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <StarRating rating={Math.round(avg)} size={20} />
        <span className="text-sm text-gray-600">{avg.toFixed(1)} out of 5 · {reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
      </div>
      {reviews.map(r => (
        <div key={r.id} className="border-b pb-4 last:border-0" style={{ borderColor: '#F0EAE3' }}>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={r.rating} size={14} />
            <span className="text-sm font-medium">{r.customer_name}</span>
            <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Add reviews to product detail page**

Replace `src/app/(store)/shop/[slug]/page.tsx` with:

```typescript
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ReviewListWrapper from '@/components/products/ReviewListWrapper'
import type { Review } from '@/types'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product
  try {
    product = await getProductBySlug(slug)
  } catch {
    notFound()
  }
  if (!product) notFound()

  let reviews: Review[] = []
  try {
    const { data } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
    reviews = (data || []) as Review[]
  } catch {
    // reviews unavailable
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/shop" className="text-sm inline-block mb-6 hover:underline" style={{ color: '#A68B6E' }}>
        ← Back to Shop
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductImageGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-2xl font-semibold" style={{ color: '#A68B6E' }}>
                PKR {product.price.toLocaleString()}
              </p>
              {product.stock_quantity === 0 && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Out of Stock</span>
              )}
            </div>
          </div>
          {product.description && (
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          )}
          <AddToCartButton product={product} />
          <p className="text-xs text-gray-400">Free delivery on orders over PKR 10,000</p>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-16 border-t pt-10" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="text-xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Customer Reviews</h2>
        <ReviewListWrapper productId={product.id} initialReviews={reviews} />
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create ReviewListWrapper (client component to handle new reviews)**

Create `src/components/products/ReviewListWrapper.tsx`:

```typescript
'use client'
import { useState } from 'react'
import ReviewList from './ReviewList'
import ReviewForm from './ReviewForm'
import type { Review } from '@/types'

export default function ReviewListWrapper({ productId, initialReviews }: { productId: string; initialReviews: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <ReviewList reviews={reviews} />
      <ReviewForm productId={productId} onSubmitted={r => setReviews(prev => [r, ...prev])} />
    </div>
  )
}
```

- [ ] **Step 7: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/products src/components/products/StarRating.tsx src/components/products/ReviewForm.tsx src/components/products/ReviewList.tsx src/components/products/ReviewListWrapper.tsx "src/app/(store)/shop/[slug]/page.tsx"
git commit -m "feat: customer reviews with 5-star rating on product pages"
```

---

## Task 7: Admin Orders — Time Filters + Delete Button

**Files:**
- Create: `src/app/api/admin/orders/[id]/route.ts`
- Modify: `src/app/admin/orders/page.tsx`

- [ ] **Step 1: Create DELETE order API**

Create `src/app/api/admin/orders/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('orders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Replace admin orders page with filters + delete**

Replace `src/app/admin/orders/page.tsx` with:

```typescript
'use client'
import { useState, useEffect, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import type { Order, OrderItem } from '@/types'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered: { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned: { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

type Filter = 'all' | 'today' | '3days' | '7days' | '1month'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: '3days', label: '3 Days' },
  { key: '7days', label: '7 Days' },
  { key: '1month', label: '1 Month' },
]

function isWithinDays(dateStr: string, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

function isOlderThan30Days(dateStr: string) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)
  return new Date(dateStr) < cutoff
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const filtered = useMemo(() => {
    const now = new Date()
    return orders.filter(o => {
      if (filter === 'all') return true
      if (filter === 'today') return new Date(o.created_at).toDateString() === now.toDateString()
      if (filter === '3days') return isWithinDays(o.created_at, 3)
      if (filter === '7days') return isWithinDays(o.created_at, 7)
      if (filter === '1month') return isWithinDays(o.created_at, 30)
      return true
    })
  }, [orders, filter])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: status }),
    })
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: status as Order['order_status'] } : o))
  }

  const deleteOrder = async (id: string) => {
    if (!confirm('Delete this order permanently?')) return
    const res = await fetch(`/api/admin/orders/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setOrders(orders.filter(o => o.id !== id))
      if (expanded === id) setExpanded(null)
    }
  }

  return (
    <div>
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>

      {/* Time filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={filter === f.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}
          >
            {f.label}
          </button>
        ))}
        <span className="text-xs text-gray-400 self-center ml-1">{filtered.length} order{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 && <p className="text-gray-400 text-sm">No orders in this period.</p>}
      <div className="space-y-3">
        {filtered.map(order => (
          <div key={order.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div
              className="flex items-center justify-between p-4 cursor-pointer"
              onClick={() => setExpanded(expanded === order.id ? null : order.id)}
            >
              <div>
                <p className="font-medium text-sm">
                  <span style={{ color: '#A68B6E' }}>{order.order_number || `#${order.id.slice(0, 8).toUpperCase()}`}</span>
                  {' — '}{order.customer_name}
                </p>
                <p className="text-xs text-gray-500">{order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">PKR {Number(order.total).toLocaleString()}</span>
                <span className="text-xs px-2 py-1 rounded-full font-medium" style={STATUS_STYLES[order.order_status]}>
                  {order.order_status}
                </span>
                {isOlderThan30Days(order.created_at) && (
                  <button
                    onClick={e => { e.stopPropagation(); deleteOrder(order.id) }}
                    className="text-red-300 hover:text-red-500 transition-colors"
                    title="Delete order (older than 30 days)"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
            {expanded === order.id && (
              <div className="border-t p-4 bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-sm font-medium mb-2">Items:</p>
                {(order.items as OrderItem[]).map((item, i) => (
                  <p key={i} className="text-sm text-gray-600 mb-1">
                    {item.product_name}{item.sku ? ` (${item.sku})` : ''} × {item.quantity} ({item.size}, {item.color}) — PKR {item.price.toLocaleString()}
                  </p>
                ))}
                <div className="text-sm mt-2 pt-2 border-t" style={{ borderColor: '#E8DDD4' }}>
                  <p>Subtotal: PKR {Number(order.subtotal).toLocaleString()} · Delivery: PKR {Number(order.delivery_charge).toLocaleString()} · <strong>Total: PKR {Number(order.total).toLocaleString()}</strong></p>
                  <p className="text-gray-500 mt-1">{order.address} · Payment: {order.payment_method}</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Update Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.id, s)}
                        className="text-xs px-3 py-1 rounded-full border transition-colors"
                        style={order.order_status === s
                          ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
                          : { borderColor: '#D1D5DB' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/orders src/app/admin/orders/page.tsx
git commit -m "feat: admin orders time filters and delete button for 30+ day orders"
```

---

## Task 8: Admin Order Notifications (Polling Badge)

**Files:**
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Add notification polling to admin layout**

In `src/app/admin/layout.tsx`, add a `newOrderCount` state that polls every 30 seconds and shows a badge on the Orders nav item.

Replace the entire file with:

```typescript
'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newOrders, setNewOrders] = useState(0)
  const lastCountRef = useRef<number | null>(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/orders')
        if (!res.ok) return
        const data = await res.json()
        const count = Array.isArray(data) ? data.filter((o: { order_status: string }) => o.order_status === 'new').length : 0
        if (lastCountRef.current === null) {
          lastCountRef.current = count
        } else if (count > lastCountRef.current) {
          setNewOrders(count - lastCountRef.current)
          lastCountRef.current = count
        }
      } catch {
        // network error — ignore
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const clearNotifications = () => {
    setNewOrders(0)
    lastCountRef.current = null
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const NAV = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, badge: 0 },
    { href: '/admin/products', icon: Package, label: 'Products', exact: false, badge: 0 },
    { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false, badge: newOrders },
    { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false, badge: 0 },
  ]

  const NavContent = () => (
    <>
      {NAV.map(({ href, icon: Icon, label, exact, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={() => { setOpen(false); if (href === '/admin/orders') clearNotifications() }}
          className="flex items-center gap-3 px-2 py-2.5 rounded text-sm transition-colors"
          style={
            isActive(href, exact)
              ? { backgroundColor: '#A68B6E', color: 'white' }
              : { color: 'rgba(255,255,255,0.7)' }
          }
        >
          <Icon size={16} />
          {label}
          {badge > 0 && (
            <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Link>
      ))}
      <div className="flex-1" />
      <button
        onClick={logout}
        className="flex items-center gap-3 px-2 py-2.5 rounded text-sm hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <LogOut size={16} />Logout
      </button>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col py-6 px-4 gap-1" style={{ backgroundColor: '#1C1C1C' }}>
        <h2 className="text-lg px-2 mb-6 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
        <NavContent />
      </aside>

      {/* Mobile overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col py-6 px-4 gap-1 z-50"
            style={{ backgroundColor: '#1C1C1C' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-lg text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30" style={{ backgroundColor: '#1C1C1C' }}>
          <h2 className="text-base text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
          <div className="flex items-center gap-3">
            {newOrders > 0 && (
              <span className="text-xs bg-red-500 text-white rounded-full px-2 py-0.5 font-bold">
                {newOrders} new order{newOrders !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => setOpen(true)} className="text-white p-1">
              <Menu size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/layout.tsx
git commit -m "feat: admin order notification badge with 30s polling"
```

---

## Task 9: Dashboard — Yearly Revenue Chart + Sales % Change

**Files:**
- Modify: `src/components/admin/DashboardCharts.tsx`
- Modify: `src/app/admin/page.tsx`

- [ ] **Step 1: Update DashboardCharts with yearly chart + % change**

Replace `src/components/admin/DashboardCharts.tsx` with:

```typescript
'use client'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import type { Order } from '@/types'

const COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355', '#D4B896', '#6B5744']

const REVENUE_TICKS = [0, 25000, 50000, 75000, 100000, 125000, 150000]

function pkrShort(n: number): string {
  if (n === 0) return '0'
  const s = n.toString()
  if (s.length <= 5) return s.slice(0, -3) + ',' + s.slice(-3)
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  const restFmt = rest.length > 2 ? rest.slice(0, -2) + ',' + rest.slice(-2) : rest
  return restFmt + ',' + last3
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%'
  const pct = ((current - previous) / previous) * 100
  return (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%'
}

export default function DashboardCharts({ orders }: { orders: Order[] }) {
  // Last 6 months for main chart
  const months6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), monthNum: d.getMonth() }
  })

  // Last 12 months for yearly chart
  const months12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (11 - i))
    return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), monthNum: d.getMonth() }
  })

  const getMonthData = (mList: typeof months6) => mList.map(m => {
    const monthOrders = orders.filter(o => {
      const d = new Date(o.created_at)
      return d.getMonth() === m.monthNum && d.getFullYear() === m.year
    })
    return {
      month: m.month,
      revenue: monthOrders.reduce((s, o) => s + o.total, 0),
      orders: monthOrders.length,
      returns: monthOrders.filter(o => o.order_status === 'returned').length,
    }
  })

  const monthly6 = getMonthData(months6)
  const yearly12 = getMonthData(months12)

  const currentMonth = monthly6[monthly6.length - 1]
  const prevMonth = monthly6[monthly6.length - 2]
  const avgMonthly = yearly12.reduce((s, m) => s + m.revenue, 0) / 12
  const yearlyTotal = yearly12.reduce((s, m) => s + m.revenue, 0)

  const colorMap: Record<string, number> = {}
  orders.forEach(o =>
    (o.items as Array<{ color: string; quantity: number }>).forEach(i => {
      colorMap[i.color] = (colorMap[i.color] || 0) + i.quantity
    })
  )
  const colorData = Object.entries(colorMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      {/* Sales summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs text-gray-500 mb-1">This Month Revenue</p>
          <p className="text-xl font-bold" style={{ color: '#1C1C1C' }}>PKR {currentMonth.revenue.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: currentMonth.revenue >= prevMonth.revenue ? '#15803D' : '#DC2626' }}>
            {pctChange(currentMonth.revenue, prevMonth.revenue)} vs last month
          </p>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs text-gray-500 mb-1">Yearly Revenue</p>
          <p className="text-xl font-bold" style={{ color: '#1C1C1C' }}>PKR {yearlyTotal.toLocaleString()}</p>
          <p className="text-xs mt-1 text-gray-400">Last 12 months</p>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs text-gray-500 mb-1">Avg Monthly Revenue</p>
          <p className="text-xl font-bold" style={{ color: '#1C1C1C' }}>PKR {Math.round(avgMonthly).toLocaleString()}</p>
          <p className="text-xs mt-1 text-gray-400">12-month average</p>
        </div>
      </div>

      {/* Monthly Revenue Bar Chart (6 months) */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Monthly Revenue — PKR (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly6}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 150000]} ticks={REVENUE_TICKS} tickFormatter={pkrShort} width={72} />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#A68B6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Yearly Revenue Line Chart (12 months) */}
      <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
        <h3 className="font-semibold mb-4">Yearly Revenue Trend — PKR (Last 12 Months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={yearly12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={pkrShort} width={72} />
            <Tooltip formatter={(v) => `PKR ${Number(v ?? 0).toLocaleString()}`} />
            <Line type="monotone" dataKey="revenue" stroke="#A68B6E" strokeWidth={2.5} dot={{ fill: '#A68B6E', r: 4 }} name="Revenue" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders & Returns Line Chart */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Monthly Orders &amp; Returns</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly6}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#1C1C1C" strokeWidth={2} dot={false} name="Orders" />
              <Line type="monotone" dataKey="returns" stroke="#EF4444" strokeWidth={2} dot={false} name="Returns" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sales by Color Pie Chart */}
        {colorData.length > 0 ? (
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Sales by Color</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name }) => name}>
                  {colorData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-lg p-5 border flex items-center justify-center text-gray-400 text-sm" style={{ borderColor: '#E8DDD4' }}>
            Sales by Color chart will appear once orders are placed.
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/DashboardCharts.tsx
git commit -m "feat: yearly revenue chart, % change, and avg monthly revenue on dashboard"
```

---

## Task 10: Final Push to GitHub + Vercel Deploy

- [ ] **Step 1: Verify full build one last time**

```bash
npm run build
```

Expected: All routes compile, zero TypeScript errors.

- [ ] **Step 2: Push all commits**

```bash
git push origin main
```

Expected: All Sprint 2 commits pushed. Vercel auto-deploys within 2-3 minutes.

- [ ] **Step 3: Verify live site**

Open `https://zadiis.com.pk` and check:
- Home page hero loads (upload a banner image from admin to test)
- `/shop/[any-product]` shows reviews section and zoom works
- `/admin/orders` shows time filter tabs
- `/admin` dashboard shows 3 new stat cards + yearly chart

---

## Self-Review

**Spec coverage:**
- ✅ Stock decrement on order + checkout out-of-stock error — Task 3
- ✅ Hero banner admin upload + home page display — Task 4
- ✅ Product image zoom / fullscreen — Task 5
- ✅ Customer reviews + 5-star rating (no login) — Task 6
- ✅ Order time filters (Today / 3 days / 7 days / 1 month) — Task 7
- ✅ Delete button for 30+ day orders — Task 7
- ✅ Admin notification badge (polling) — Task 8
- ✅ Yearly revenue chart + % change + avg monthly — Task 9
- ✅ DB migration for reviews — Task 1

**Visitor count:** Not included — requires Vercel Analytics (enable in Vercel dashboard → Analytics tab → Enable, then install `@vercel/analytics` package). Deferred as it needs a separate package install and environment decision.

**15-day return policy display:** Not a UI change — this is enforced manually by the owner when deleting orders. The delete button in Task 7 is only shown for 30+ day orders, giving the owner full manual control.

**Type consistency:** `Review` type defined in Task 2, used consistently in Task 6 components. `Filter` type defined inline in Task 7. All `Order`, `OrderItem` types from existing `src/types/index.ts` — no changes needed.
