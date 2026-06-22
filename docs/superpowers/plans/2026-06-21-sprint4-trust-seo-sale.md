# Sprint 4: Trust, SEO & Sale Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add trust signals, policy pages, full SEO (metadata/sitemap/JSON-LD), best sellers section, and an admin-controlled sale page to ZADIIS.

**Architecture:** The sale system uses two new DB tables (`sales`, `sale_products`) with a unique-active-sale constraint enforced at both DB and application level. A public `/api/sale` endpoint feeds the sale page and the delivery-zones API (which overrides zone-based delivery with a flat rate when a sale is active). SEO uses Next.js 16 App Router's built-in `metadata`, `sitemap.ts`, and `robots.ts` — no extra libraries needed.

**Tech Stack:** Next.js 16.2.7 App Router, Supabase (supabaseAdmin service role for server, supabase anon client for store reads), TypeScript, Tailwind CSS v4, Resend, Lucide React

## Global Constraints

- `export const dynamic = 'force-dynamic'` must be the VERY FIRST line (before all imports) on every admin server page and on sitemap.ts
- No arbitrary Tailwind color classes — use `style={{}}` for all brand colors
- Brand colors: bg `#FAF8F5`, text `#1C1C1C`, accent `#A68B6E`, border `#E8DDD4`
- All admin API routes and admin server components use `supabaseAdmin` from `@/lib/supabase/server`
- Store-facing reads in `lib/products.ts` use `supabase` (anon client) from `@/lib/supabase/client`
- `customer_email` is optional — all email sends guard with `if (!to) return`
- `params` in App Router is a Promise — always `const { x } = await params`
- NEVER mark an order paid from the frontend — only via webhook or admin manual action
- When activating a sale: deactivate all others first (application-level), then activate the new one
- Sale delivery charge overrides zone-based delivery for ALL orders while a sale is active
- `npx tsc --noEmit` must pass with zero errors after every task

---

### Task 1: Trust Strip Enhancement + Policy Pages + Footer Links

**Files:**
- Modify: `store/src/app/(store)/page.tsx`
- Create: `store/src/app/(store)/returns/page.tsx`
- Create: `store/src/app/(store)/shipping/page.tsx`
- Create: `store/src/app/(store)/privacy/page.tsx`
- Modify: `store/src/components/layout/Footer.tsx`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces: `/returns`, `/shipping`, `/privacy` routes — referenced by sitemap in Task 2

- [ ] **Step 1: Update trust bar — 5 items replacing 3**

In `store/src/app/(store)/page.tsx`, replace the imports line that includes `Truck, RefreshCw, Shield` with:

```tsx
import { Truck, RefreshCw, MapPin, Banknote, MessageCircle } from 'lucide-react'
```

Replace the entire `{/* Trust Bar */}` section (lines 62–68):

```tsx
{/* Trust Bar */}
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

- [ ] **Step 2: Create returns policy page**

Create `store/src/app/(store)/returns/page.tsx`:

```tsx
export default function ReturnsPage() {
  const waNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''
  const waLink = waNumber ? `https://wa.me/${waNumber}` : '/contact'

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Return & Exchange Policy</h1>
      <p className="text-sm mb-8" style={{ color: '#A68B6E' }}>Last updated: June 2026</p>
      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>7-Day Exchange Policy</h2>
          <p>We offer a 7-day exchange window from the date of delivery. Items must be unworn, unwashed, and in original condition with all tags attached.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>How to Exchange</h2>
          <p>
            <a href={waLink} className="underline" style={{ color: '#A68B6E' }}>WhatsApp us</a> within 7 days of receiving your order. Share your order number and the reason for the exchange. We will guide you through the process.
          </p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Non-Exchangeable Items</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Items worn, washed, or damaged after delivery</li>
            <li>Sale items marked as final sale</li>
            <li>Custom stitched or altered items</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Defective Items</h2>
          <p>If you receive a defective or incorrect item, contact us immediately via WhatsApp with photos. We will replace it at no extra cost.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Refunds</h2>
          <p>We do not offer cash refunds. Exchanges are processed within 3–5 business days after we receive the returned item.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create shipping policy page**

Create `store/src/app/(store)/shipping/page.tsx`:

```tsx
export default function ShippingPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Shipping Policy</h1>
      <p className="text-sm mb-8" style={{ color: '#A68B6E' }}>Last updated: June 2026</p>
      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Delivery Areas</h2>
          <p>We deliver nationwide across Pakistan. Delivery charges vary by city and are shown at checkout.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Delivery Time</h2>
          <p>Orders are dispatched within 1–2 business days. Expected delivery:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Karachi, Lahore, Islamabad: 2–3 business days</li>
            <li>Other major cities: 3–5 business days</li>
            <li>Remote areas: 5–7 business days</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Free Delivery</h2>
          <p>Orders above PKR 2,000 qualify for free delivery (where applicable). This threshold may change during sale periods.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Cash on Delivery</h2>
          <p>COD is available in select cities. The option appears at checkout if available for your city. Please keep the exact amount ready at delivery.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Order Tracking</h2>
          <p>Once dispatched, you will receive an update via email (if provided) or WhatsApp us with your order number for tracking information.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create privacy policy page**

Create `store/src/app/(store)/privacy/page.tsx`:

```tsx
export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Privacy Policy</h1>
      <p className="text-sm mb-8" style={{ color: '#A68B6E' }}>Last updated: June 2026</p>
      <div className="space-y-8 text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Information We Collect</h2>
          <p>We collect information you provide when placing an order: your name, phone number, email address (optional), and delivery address. We do not store payment card details — payments are processed securely via Safepay.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To process and deliver your order</li>
            <li>To send order confirmation and delivery updates (if email provided)</li>
            <li>To respond to queries via WhatsApp or email</li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Data Sharing</h2>
          <p>We do not sell or share your personal information with third parties, except with delivery partners who need your address to complete your order.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Data Security</h2>
          <p>Your data is stored securely using industry-standard encryption. All pages are served over SSL. Payment processing is handled by Safepay, a PCI-compliant payment gateway.</p>
        </section>
        <section>
          <h2 className="text-xl mb-3 text-gray-900" style={{ fontFamily: 'Playfair Display, serif' }}>Contact</h2>
          <p>For any privacy concerns, email us at <a href="mailto:info@zadiis.com.pk" className="underline" style={{ color: '#A68B6E' }}>info@zadiis.com.pk</a>.</p>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update footer with policy links**

Replace the entire contents of `store/src/components/layout/Footer.tsx`:

```tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1C1C1C', color: 'white' }} className="mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="text-xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS</h3>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>Modern Pakistani women&apos;s fashion. Quality you can feel.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/shop" className="hover:text-white transition-colors">All Products</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm" style={{ color: '#9CA3AF' }}>
            <li><Link href="/returns" className="hover:text-white transition-colors">Returns & Exchanges</Link></li>
            <li><Link href="/shipping" className="hover:text-white transition-colors">Shipping Policy</Link></li>
            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
            <li><Link href="/contact" className="hover:text-white transition-colors">WhatsApp Support</Link></li>
            <li><a href="mailto:info@zadiis.com.pk" className="hover:text-white transition-colors">info@zadiis.com.pk</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t text-center py-4 text-xs" style={{ borderColor: '#374151', color: '#6B7280' }}>
        © {new Date().getFullYear()} ZADIIS. All rights reserved.
      </div>
    </footer>
  )
}
```

- [ ] **Step 6: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`. Verify:
- `http://localhost:3000` — trust bar shows 5 items in a row on desktop
- `http://localhost:3000/returns` — renders correctly
- `http://localhost:3000/shipping` — renders correctly
- `http://localhost:3000/privacy` — renders correctly
- Footer: Returns, Shipping, Privacy links visible and working

- [ ] **Step 8: Commit**

```bash
git add store/src/app/\(store\)/page.tsx store/src/components/layout/Footer.tsx store/src/app/\(store\)/returns/page.tsx store/src/app/\(store\)/shipping/page.tsx store/src/app/\(store\)/privacy/page.tsx
git commit -m "feat: trust bar 5 items, policy pages (returns, shipping, privacy), footer links"
```

---

### Task 2: SEO — Metadata, Sitemap, Robots, Product JSON-LD

**Files:**
- Modify: `store/src/app/layout.tsx`
- Create: `store/src/app/sitemap.ts`
- Create: `store/src/app/robots.ts`
- Modify: `store/src/app/(store)/shop/[slug]/page.tsx`

**Interfaces:**
- Consumes: policy routes from Task 1
- Produces: `/sitemap.xml`, `/robots.txt`, dynamic product OG + JSON-LD

- [ ] **Step 1: Update root layout with full OG metadata**

Replace `store/src/app/layout.tsx` entirely:

```tsx
import type { Metadata } from 'next'
import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zadiis.com.pk'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "ZADII'S — Women's Fashion Pakistan",
    template: "%s — ZADII'S",
  },
  description: "Shop premium Pakistani women's fashion at ZADII'S. Kurtis, suits, dresses and more. Nationwide delivery, cash on delivery available.",
  keywords: ['women fashion Pakistan', 'Pakistani suits online', 'kurtis online Pakistan', 'women clothing Pakistan', 'ladies fashion', 'zadiis'],
  openGraph: {
    title: "ZADII'S — Women's Fashion Pakistan",
    description: "Shop premium Pakistani women's fashion. Nationwide delivery, COD available.",
    url: APP_URL,
    siteName: "ZADII'S",
    locale: 'en_PK',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "ZADII'S — Women's Fashion Pakistan",
    description: "Shop premium Pakistani women's fashion. Nationwide delivery, COD available.",
  },
  alternates: { canonical: APP_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

- [ ] **Step 2: Create sitemap.ts**

Create `store/src/app/sitemap.ts`:

```ts
export const dynamic = 'force-dynamic'
import { MetadataRoute } from 'next'
import { supabaseAdmin } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zadiis.com.pk'

  const { data: products } = await supabaseAdmin
    .from('products')
    .select('slug, created_at')
    .eq('is_active', true)

  const productUrls: MetadataRoute.Sitemap = (products || []).map(p => ({
    url: `${APP_URL}/shop/${p.slug}`,
    lastModified: new Date(p.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [
    { url: APP_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/shop`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/sale`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${APP_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${APP_URL}/returns`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${APP_URL}/shipping`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${APP_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    ...productUrls,
  ]
}
```

- [ ] **Step 3: Create robots.ts**

Create `store/src/app/robots.ts`:

```ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zadiis.com.pk'
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api/', '/checkout', '/cart', '/order/'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 4: Add generateMetadata to product page**

In `store/src/app/(store)/shop/[slug]/page.tsx`, add these lines after the existing imports and before the `export default async function ProductPage`:

```tsx
import type { Metadata } from 'next'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zadiis.com.pk'
  let product
  try { product = await getProductBySlug(slug) } catch { return {} }
  if (!product) return {}
  const description = product.description
    || `Shop ${product.name} at ZADII'S. PKR ${product.price.toLocaleString()}. Nationwide delivery in Pakistan.`
  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} — ZADII'S`,
      description,
      images: product.images[0]
        ? [{ url: product.images[0], width: 800, height: 1067, alt: product.name }]
        : [],
      url: `${APP_URL}/shop/${product.slug}`,
      type: 'website',
    },
    alternates: { canonical: `${APP_URL}/shop/${product.slug}` },
  }
}
```

- [ ] **Step 5: Add JSON-LD structured data to product page**

Inside the `ProductPage` component, add the JSON-LD constant just before `return (`:

```tsx
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.zadiis.com.pk'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    image: product.images,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'PKR',
      availability: product.stock_quantity > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url: `${APP_URL}/shop/${product.slug}`,
      seller: { '@type': 'Organization', name: "ZADII'S" },
    },
  }
```

Add the script tag as the last child inside the outer `<div className="max-w-5xl ...">`:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
```

- [ ] **Step 6: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Verify sitemap and robots**

Run `npm run dev`. Check:
- `http://localhost:3000/sitemap.xml` — returns XML with homepage, shop, product URLs
- `http://localhost:3000/robots.txt` — shows `Disallow: /admin` and `Sitemap:` line
- `http://localhost:3000/shop/<any-slug>` — view page source, confirm `<script type="application/ld+json">` is present with correct product data

- [ ] **Step 8: Commit**

```bash
git add store/src/app/layout.tsx store/src/app/sitemap.ts store/src/app/robots.ts "store/src/app/(store)/shop/[slug]/page.tsx"
git commit -m "feat: SEO — OG metadata, sitemap.xml, robots.txt, product generateMetadata + JSON-LD"
```

---

### Task 3: DB Migration + Types

**Files:**
- Create: `store/supabase/sprint4.sql`
- Modify: `store/src/types/index.ts`

**Interfaces:**
- Consumes: nothing from other tasks
- Produces:
  - `Sale` type: `{ id, title, description, banner_image, delivery_charge, ends_at, is_active, created_at, sale_products? }`
  - `SaleProduct` type: `{ id, sale_id, product_id, sale_price, created_at, products? }`
  - `Order.is_sale: boolean`
  - `Product.is_bestseller: boolean`

- [ ] **Step 1: Write sprint4.sql**

Create `store/supabase/sprint4.sql`:

```sql
-- Sprint 4 Migration — run in Supabase SQL Editor

-- Sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  banner_image text,
  delivery_charge decimal(10,2) NOT NULL DEFAULT 150,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Sale products join table (one product can be in one sale at a time)
CREATE TABLE IF NOT EXISTS sale_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id uuid REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  sale_price decimal(10,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sale_id, product_id)
);

-- Enforce only one active sale at a time at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS only_one_active_sale ON sales (is_active) WHERE is_active = true;

-- Add is_sale flag to orders (set when a sale is active at time of purchase)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_sale boolean NOT NULL DEFAULT false;

-- Add is_bestseller flag to products (admin marks; shown in Most Loved on homepage)
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bestseller boolean NOT NULL DEFAULT false;

-- Row level security
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
```

- [ ] **Step 2: Run the migration**

Open **Supabase Dashboard → SQL Editor**, paste the contents of `sprint4.sql` and click Run. Verify: no errors, all statements execute successfully.

- [ ] **Step 3: Update TypeScript types**

Replace the entire contents of `store/src/types/index.ts`:

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

- [ ] **Step 4: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors. (If admin product forms show `is_bestseller` type errors, they'll be resolved in Task 7.)

- [ ] **Step 5: Commit**

```bash
git add store/supabase/sprint4.sql store/src/types/index.ts
git commit -m "feat: sprint4 DB migration (sales, sale_products, is_sale on orders, is_bestseller on products) + types"
```

---

### Task 4: Admin Sales Management

**Files:**
- Modify: `store/src/app/admin/layout.tsx`
- Create: `store/src/app/api/admin/sales/route.ts`
- Create: `store/src/app/api/admin/sales/[id]/route.ts`
- Create: `store/src/app/api/admin/sales/[id]/products/route.ts`
- Create: `store/src/app/admin/sales/page.tsx`
- Create: `store/src/app/admin/sales/SaleToggle.tsx`
- Create: `store/src/app/admin/sales/new/page.tsx`
- Create: `store/src/app/admin/sales/[id]/page.tsx`
- Create: `store/src/app/admin/sales/[id]/SaleEditForm.tsx`

**Interfaces:**
- Consumes: `Sale`, `SaleProduct`, `Product` types from Task 3
- Produces:
  - `GET /api/admin/sales` → `Sale[]`
  - `POST /api/admin/sales` → `Sale`
  - `GET /api/admin/sales/[id]` → `Sale & { sale_products: SaleProduct[] }`
  - `PUT /api/admin/sales/[id]` → `{ success: true }`
  - `DELETE /api/admin/sales/[id]` → `{ success: true }`
  - `POST /api/admin/sales/[id]/products` → `{ success: true }`
  - `DELETE /api/admin/sales/[id]/products` → `{ success: true }`

- [ ] **Step 1: Add Sales link to admin sidebar**

In `store/src/app/admin/layout.tsx`:

1. Add `Tag` to the lucide-react import:
```tsx
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, CreditCard, FileText, Tag } from 'lucide-react'
```

2. Add to the `NAV` array after the Invoices entry:
```tsx
{ href: '/admin/sales', icon: Tag, label: 'Sales', exact: false, badge: 0 },
```

- [ ] **Step 2: Create admin sales list + create API**

Create `store/src/app/api/admin/sales/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, delivery_charge, ends_at } = body
  if (!title || delivery_charge === undefined) {
    return NextResponse.json({ error: 'title and delivery_charge required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('sales')
    .insert([{
      title,
      description: description || null,
      delivery_charge: Number(delivery_charge),
      ends_at: ends_at || null,
      is_active: false,
    }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Create admin sales [id] API (get + update + delete)**

Create `store/src/app/api/admin/sales/[id]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(*, products(id, name, price, images, slug, stock_quantity, is_active, is_bestseller, sizes, colors, description, sku, category_id, created_at))')
    .eq('id', id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.title !== undefined) update.title = body.title
  if (body.description !== undefined) update.description = body.description || null
  if (body.delivery_charge !== undefined) update.delivery_charge = Number(body.delivery_charge)
  if (body.ends_at !== undefined) update.ends_at = body.ends_at || null

  if (body.is_active === true) {
    // Deactivate all other sales first, then activate this one
    await supabaseAdmin.from('sales').update({ is_active: false }).neq('id', id)
    update.is_active = true
  } else if (body.is_active === false) {
    update.is_active = false
  }

  const { error } = await supabaseAdmin.from('sales').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Create sale products API (add + remove)**

Create `store/src/app/api/admin/sales/[id]/products/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sale_id } = await params
  const { product_id, sale_price } = await req.json()
  if (!product_id || sale_price === undefined) {
    return NextResponse.json({ error: 'product_id and sale_price required' }, { status: 400 })
  }
  const { error } = await supabaseAdmin
    .from('sale_products')
    .upsert([{ sale_id, product_id, sale_price: Number(sale_price) }], { onConflict: 'sale_id,product_id' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sale_id } = await params
  const { product_id } = await req.json()
  const { error } = await supabaseAdmin
    .from('sale_products')
    .delete()
    .eq('sale_id', sale_id)
    .eq('product_id', product_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 5: Create admin sales list page**

Create `store/src/app/admin/sales/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase/server'
import Link from 'next/link'
import SaleToggle from './SaleToggle'

export default async function AdminSalesPage() {
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Sales</h1>
        <Link
          href="/admin/sales/new"
          className="px-4 py-2 text-sm text-white rounded"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          + New Sale
        </Link>
      </div>

      {!sales || sales.length === 0 ? (
        <p className="text-gray-400">No sales yet. Create one to get started.</p>
      ) : (
        <div className="space-y-4">
          {sales.map(sale => (
            <div key={sale.id} className="bg-white rounded-lg border p-5" style={{ borderColor: '#E8DDD4' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {sale.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>LIVE</span>
                    )}
                    <h2 className="font-semibold">{sale.title}</h2>
                  </div>
                  {sale.description && <p className="text-sm text-gray-500 mb-1">{sale.description}</p>}
                  <p className="text-sm text-gray-400">
                    Flat delivery: PKR {Number(sale.delivery_charge).toLocaleString()}
                    {sale.ends_at && ` · Ends ${new Date(sale.ends_at).toLocaleDateString('en-PK')}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SaleToggle id={sale.id} isActive={sale.is_active} />
                  <Link
                    href={`/admin/sales/${sale.id}`}
                    className="px-3 py-1.5 text-xs border rounded"
                    style={{ borderColor: '#E8DDD4' }}
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create SaleToggle client component**

Create `store/src/app/admin/sales/SaleToggle.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SaleToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    await fetch(`/api/admin/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    router.refresh()
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="px-3 py-1.5 text-xs rounded font-medium transition-colors"
      style={isActive
        ? { backgroundColor: '#FEE2E2', color: '#991B1B' }
        : { backgroundColor: '#DCFCE7', color: '#166534' }}
    >
      {loading ? '...' : isActive ? 'Deactivate' : 'Activate'}
    </button>
  )
}
```

- [ ] **Step 7: Create new sale form page**

Create `store/src/app/admin/sales/new/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', delivery_charge: '150', ends_at: '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        delivery_charge: Number(form.delivery_charge),
        ends_at: form.ends_at || null,
      }),
    })
    if (res.ok) {
      const sale = await res.json()
      router.push(`/admin/sales/${sale.id}`)
    } else {
      alert('Failed to create sale. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div>
          <Label htmlFor="title">Sale Title *</Label>
          <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Summer Sale 2026" className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description (shown on sale page)</Label>
          <textarea
            id="desc"
            className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none"
            rows={2}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Up to 50% off on selected items"
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>
        <div>
          <Label htmlFor="delivery">Flat Delivery Charge for All Orders (PKR) *</Label>
          <Input id="delivery" required type="number" min="0" value={form.delivery_charge} onChange={e => set('delivery_charge', e.target.value)} className="mt-1" />
          <p className="text-xs mt-1 text-gray-400">Replaces city-based delivery during the sale</p>
        </div>
        <div>
          <Label htmlFor="ends">End Date & Time (optional — enables countdown timer)</Label>
          <Input id="ends" type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" />
        </div>
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

- [ ] **Step 8: Create sale detail server page**

Create `store/src/app/admin/sales/[id]/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import SaleEditForm from './SaleEditForm'
import type { Product } from '@/types'

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [{ data: sale }, { data: allProducts }] = await Promise.all([
    supabaseAdmin
      .from('sales')
      .select('*, sale_products(*, products(id, name, price, images, slug, stock_quantity, is_active, is_bestseller, sizes, colors, description, sku, category_id, created_at))')
      .eq('id', id)
      .single(),
    supabaseAdmin
      .from('products')
      .select('id, name, price, images, slug, stock_quantity, is_active, is_bestseller, sizes, colors, description, sku, category_id, created_at')
      .eq('is_active', true)
      .order('name'),
  ])

  if (!sale) notFound()

  return <SaleEditForm sale={sale} allProducts={(allProducts || []) as Product[]} />
}
```

- [ ] **Step 9: Create SaleEditForm client component**

Create `store/src/app/admin/sales/[id]/SaleEditForm.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Sale, Product, SaleProduct } from '@/types'

type SaleWithProducts = Sale & {
  sale_products: Array<SaleProduct & { products: Product }>
}

export default function SaleEditForm({ sale, allProducts }: { sale: SaleWithProducts; allProducts: Product[] }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: sale.title,
    description: sale.description || '',
    delivery_charge: String(sale.delivery_charge),
    ends_at: sale.ends_at ? new Date(sale.ends_at).toISOString().slice(0, 16) : '',
  })
  const [selectedProductId, setSelectedProductId] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [addingProduct, setAddingProduct] = useState(false)

  const currentProductIds = new Set(sale.sale_products.map(sp => sp.product_id))
  const availableProducts = allProducts.filter(p => !currentProductIds.has(p.id))
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const saveDetails = async () => {
    setSaving(true)
    await fetch(`/api/admin/sales/${sale.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title,
        description: form.description || null,
        delivery_charge: Number(form.delivery_charge),
        ends_at: form.ends_at || null,
      }),
    })
    setSaving(false)
    router.refresh()
  }

  const addProduct = async () => {
    if (!selectedProductId || !salePrice) return
    setAddingProduct(true)
    await fetch(`/api/admin/sales/${sale.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: selectedProductId, sale_price: Number(salePrice) }),
    })
    setSelectedProductId('')
    setSalePrice('')
    setAddingProduct(false)
    router.refresh()
  }

  const removeProduct = async (productId: string) => {
    await fetch(`/api/admin/sales/${sale.id}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    router.refresh()
  }

  const deleteSale = async () => {
    if (!confirm('Delete this sale? This cannot be undone.')) return
    await fetch(`/api/admin/sales/${sale.id}`, { method: 'DELETE' })
    router.push('/admin/sales')
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Sale</h1>
        <button onClick={deleteSale} className="text-sm px-3 py-1.5 rounded border" style={{ color: '#991B1B', borderColor: '#FCA5A5' }}>
          Delete Sale
        </button>
      </div>

      {/* Sale details */}
      <div className="bg-white p-5 rounded-lg border space-y-4" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold">Sale Details</h2>
        <div>
          <Label>Title</Label>
          <Input value={form.title} onChange={e => set('title', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Description</Label>
          <textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} style={{ borderColor: '#E2E8F0' }} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Flat Delivery (PKR)</Label>
            <Input type="number" min="0" value={form.delivery_charge} onChange={e => set('delivery_charge', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>End Date/Time (optional)</Label>
            <Input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" />
          </div>
        </div>
        <Button onClick={saveDetails} disabled={saving} className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          {saving ? 'Saving...' : 'Save Details'}
        </Button>
      </div>

      {/* Products in sale */}
      <div className="bg-white p-5 rounded-lg border space-y-4" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold">Products in Sale ({sale.sale_products.length})</h2>
        {sale.sale_products.length === 0 && <p className="text-sm text-gray-400">No products added yet.</p>}
        <div className="space-y-2">
          {sale.sale_products.map(sp => (
            <div key={sp.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: '#F0EAE3' }}>
              {sp.products.images[0] && (
                <Image src={sp.products.images[0]} alt={sp.products.name} width={40} height={40} className="rounded object-cover aspect-square" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{sp.products.name}</p>
                <p className="text-xs text-gray-400">
                  Original: PKR {Number(sp.products.price).toLocaleString()} →{' '}
                  <span style={{ color: '#A68B6E' }}>Sale: PKR {Number(sp.sale_price).toLocaleString()}</span>
                  {' '}({Math.round((sp.products.price - sp.sale_price) / sp.products.price * 100)}% off)
                </p>
              </div>
              <button onClick={() => removeProduct(sp.product_id)} className="text-xs px-2 py-1 rounded shrink-0" style={{ color: '#991B1B', backgroundColor: '#FEE2E2' }}>Remove</button>
            </div>
          ))}
        </div>

        {/* Add product */}
        {availableProducts.length > 0 && (
          <div className="border-t pt-4 space-y-3" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-sm font-medium">Add Product to Sale</p>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={e => {
                  setSelectedProductId(e.target.value)
                  const p = allProducts.find(p => p.id === e.target.value)
                  if (p) setSalePrice(String(Math.round(p.price * 0.8)))
                }}
                className="flex-1 border rounded px-3 py-2 text-sm"
                style={{ borderColor: '#E2E8F0' }}
              >
                <option value="">— Select product —</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (PKR {p.price.toLocaleString()})</option>
                ))}
              </select>
              <Input
                type="number"
                min="0"
                placeholder="Sale price"
                value={salePrice}
                onChange={e => setSalePrice(e.target.value)}
                className="w-32"
              />
              <Button
                onClick={addProduct}
                disabled={addingProduct || !selectedProductId || !salePrice}
                className="text-white rounded-none shrink-0"
                style={{ backgroundColor: '#A68B6E' }}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-400">Pre-filled at 80% of original price — adjust before clicking Add.</p>
          </div>
        )}
      </div>

      <Button variant="outline" className="rounded-none" onClick={() => router.push('/admin/sales')}>
        ← Back to Sales
      </Button>
    </div>
  )
}
```

- [ ] **Step 10: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Manual verification**

Run `npm run dev`. Verify:
- `/admin/sales` — "Sales" appears in sidebar, list page renders
- `/admin/sales/new` — create form works, redirects to edit page after submit
- `/admin/sales/<id>` — edit details + add products (auto-fills 80% price) + remove products
- Activate sale → LIVE badge appears, activating a second sale deactivates the first
- Delete → removed from list

- [ ] **Step 12: Commit**

```bash
git add store/src/app/admin/layout.tsx store/src/app/api/admin/sales/ store/src/app/admin/sales/
git commit -m "feat: admin sales management — create, edit, toggle active, manage products per sale"
```

---

### Task 5: Sale Public API + Delivery Override + Checkout + Email

**Files:**
- Create: `store/src/app/api/sale/route.ts`
- Modify: `store/src/app/api/delivery-zones/route.ts`
- Modify: `store/src/app/(store)/checkout/page.tsx`
- Modify: `store/src/app/api/orders/route.ts`
- Modify: `store/src/app/api/payments/tracker/route.ts`
- Modify: `store/src/lib/email.ts`

**Interfaces:**
- Consumes: `Sale`, `SaleProduct` types from Task 3
- Produces:
  - `GET /api/sale` → `{ sale: Sale | null }`
  - `GET /api/delivery-zones` → adds `sale_active: boolean, sale_delivery_charge: number | null`
  - `sendOwnerSaleOrder(d)` exported from `@/lib/email`

- [ ] **Step 1: Create public sale API**

Create `store/src/app/api/sale/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select(`
      *,
      sale_products(
        *,
        products(id, name, slug, price, images, stock_quantity, sizes, colors, description, sku, is_active, is_bestseller, category_id, created_at, categories(name, slug))
      )
    `)
    .eq('is_active', true)
    .single()

  return NextResponse.json({ sale: sale || null })
}
```

- [ ] **Step 2: Update delivery-zones to expose sale delivery charge**

Replace the entire contents of `store/src/app/api/delivery-zones/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const [{ data: zones }, { data: settings }, { data: activeSale }] = await Promise.all([
      supabaseAdmin.from('delivery_zones').select('id, city, delivery_charge').eq('is_active', true).order('city'),
      supabaseAdmin.from('store_settings').select('key, value'),
      supabaseAdmin.from('sales').select('delivery_charge').eq('is_active', true).maybeSingle(),
    ])
    const cod_enabled = settings?.find(s => s.key === 'cod_enabled')?.value === 'true'
    const sale_active = !!activeSale
    const sale_delivery_charge = activeSale ? Number(activeSale.delivery_charge) : null
    return NextResponse.json({ zones: zones || [], cod_enabled, sale_active, sale_delivery_charge })
  } catch {
    return NextResponse.json({ zones: [], cod_enabled: false, sale_active: false, sale_delivery_charge: null })
  }
}
```

- [ ] **Step 3: Update checkout to handle sale delivery charge**

In `store/src/app/(store)/checkout/page.tsx`:

**a.** Add two new state variables after `const [deliveryCharge, setDeliveryCharge] = useState(0)`:
```tsx
const [saleActive, setSaleActive] = useState(false)
const [saleDeliveryCharge, setSaleDeliveryCharge] = useState<number | null>(null)
```

**b.** Replace the delivery-zones fetch inside `useEffect` with:
```tsx
fetch('/api/delivery-zones')
  .then(r => r.json())
  .then(({ zones, cod_enabled, sale_active, sale_delivery_charge }: {
    zones: DeliveryZone[]; cod_enabled: boolean; sale_active: boolean; sale_delivery_charge: number | null
  }) => {
    setZones(zones)
    setCodEnabled(cod_enabled)
    setSaleActive(sale_active)
    setSaleDeliveryCharge(sale_delivery_charge)
    if (sale_active && sale_delivery_charge !== null) {
      setDeliveryCharge(sale_delivery_charge)
    }
  })
```

**c.** Replace the `handleCityChange` function:
```tsx
const handleCityChange = (city: string) => {
  set('city', city)
  if (saleActive && saleDeliveryCharge !== null) {
    setDeliveryCharge(saleDeliveryCharge)
  } else {
    const zone = zones.find(z => z.city === city)
    setDeliveryCharge(zone?.delivery_charge ?? 0)
  }
}
```

**d.** Replace the delivery hint `{form.city && <p ...>}` with:
```tsx
{form.city && (
  <p className="text-sm mt-1" style={{ color: '#A68B6E' }}>
    {saleActive
      ? `Sale flat rate: PKR ${saleDeliveryCharge?.toLocaleString()}`
      : `Delivery charge: PKR ${deliveryCharge.toLocaleString()}`}
  </p>
)}
```

- [ ] **Step 4: Set is_sale on COD orders**

In `store/src/app/api/orders/route.ts`, add this block immediately after the stock validation loop (before the `let order = null` line):

```ts
// Set is_sale flag if a sale is active when the order is placed
const { count: saleCount } = await supabaseAdmin
  .from('sales')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
const is_sale = (saleCount ?? 0) > 0
```

Then add `is_sale` to the insert payload inside the `for (let attempt ...)` loop:
```ts
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
  is_sale,
}])
```

- [ ] **Step 5: Set is_sale on online payment orders**

Apply the same change to `store/src/app/api/payments/tracker/route.ts`.

Add the is_sale check after the stock validation loop (before step 3 — the Safepay API call comment):
```ts
// Set is_sale flag if a sale is active
const { count: saleCount } = await supabaseAdmin
  .from('sales')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
const is_sale = (saleCount ?? 0) > 0
```

Add `is_sale` to the insert payload inside the `for (let attempt ...)` loop:
```ts
.insert([{
  order_number,
  customer_name, customer_phone,
  customer_email: customer_email ?? null,
  address, city, items,
  subtotal: subtotal ?? total,
  delivery_charge: delivery_charge ?? 0,
  total,
  payment_method,
  payment_status: 'pending',
  safepay_tracker: trackerToken,
  is_sale,
}])
```

- [ ] **Step 6: Add sendOwnerSaleOrder to email.ts**

Append this function to the end of `store/src/lib/email.ts`:

```ts
export async function sendOwnerSaleOrder(d: {
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  address: string
  city: string
  items: Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>
  subtotal: number
  delivery_charge: number
  total: number
  payment_method: string
  payment_status: string
}): Promise<void> {
  const itemRows = buildItemRows(d.items)
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#A68B6E;font-family:Georgia,serif;border-bottom:2px solid #A68B6E;padding-bottom:8px">🏷️ SALE ORDER — ${d.order_number}</h2>
      <p><strong>Customer:</strong> ${d.customer_name} · ${d.customer_phone}</p>
      <p><strong>Email:</strong> ${d.customer_email ?? '—'}</p>
      <p><strong>Address:</strong> ${d.address}, ${d.city}</p>
      <p><strong>Payment:</strong> ${d.payment_method} · ${d.payment_status}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemRows}</table>
      <p><strong>Subtotal:</strong> PKR ${Number(d.subtotal).toLocaleString()}</p>
      <p><strong>Delivery:</strong> PKR ${Number(d.delivery_charge).toLocaleString()}</p>
      <p style="font-size:1.1em;color:#A68B6E"><strong>Total: PKR ${Number(d.total).toLocaleString()}</strong></p>
    </div>`
  try {
    await resend.emails.send({
      from: FROM,
      to: process.env.OWNER_EMAIL!,
      subject: `🏷️ SALE ORDER ${d.order_number} — ${d.payment_method} — PKR ${Number(d.total).toLocaleString()}`,
      html,
    })
  } catch (e) {
    console.error('sendOwnerSaleOrder failed:', e)
  }
}
```

- [ ] **Step 7: Use sendOwnerSaleOrder in the orders route**

In `store/src/app/api/orders/route.ts`:

Update the import to include `sendOwnerSaleOrder`:
```ts
import { sendOwnerNewOrder, sendOwnerSaleOrder, sendCustomerOrderConfirmed } from '@/lib/email'
```

Replace the `await sendOwnerNewOrder(...)` call with:
```ts
if (is_sale) {
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
} else {
  await sendOwnerNewOrder({
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

Apply the same `is_sale` email routing to `store/src/app/api/payments/tracker/route.ts` for the `sendOwnerNewOrder` call in that file (same if/else block using the same data shape).

- [ ] **Step 8: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Verify delivery override**

Run `npm run dev`. In browser console on the checkout page:
```js
fetch('/api/delivery-zones').then(r=>r.json()).then(console.log)
```
- With no active sale: `{ zones: [...], cod_enabled: true, sale_active: false, sale_delivery_charge: null }`
- Activate a sale in admin (e.g. PKR 150 delivery), run again: `{ ..., sale_active: true, sale_delivery_charge: 150 }`
- Go to checkout, pick any city — delivery shows "Sale flat rate: PKR 150"

- [ ] **Step 10: Commit**

```bash
git add store/src/app/api/sale/ store/src/app/api/delivery-zones/route.ts "store/src/app/(store)/checkout/page.tsx" store/src/app/api/orders/route.ts store/src/app/api/payments/tracker/route.ts store/src/lib/email.ts
git commit -m "feat: public sale API, delivery zone sale override, is_sale on orders, sale owner email"
```

---

### Task 6: Sale Store Page + Homepage Banner + Shop Filter + ProductCard

**Files:**
- Create: `store/src/components/sale/CountdownTimer.tsx`
- Create: `store/src/app/(store)/sale/page.tsx`
- Modify: `store/src/app/(store)/page.tsx`
- Modify: `store/src/lib/products.ts`
- Modify: `store/src/components/products/ProductCard.tsx`

**Interfaces:**
- Consumes: `GET /api/sale` from Task 5, `Sale`, `SaleProduct`, `Product` types from Task 3
- Produces:
  - `/sale` route — countdown, stats bar, product grid with badges
  - `ProductCard({ product, salePrice? })` — extended with optional sale badge
  - `getBestsellerProducts(limit)` exported from `@/lib/products`

- [ ] **Step 1: Update ProductCard with optional sale badge**

Replace the entire contents of `store/src/components/products/ProductCard.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

export default function ProductCard({ product, salePrice }: { product: Product; salePrice?: number }) {
  const image = product.images[0] || ''
  const discountPct = salePrice && salePrice < product.price
    ? Math.round((product.price - salePrice) / product.price * 100)
    : 0

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg bg-white aspect-[3/4] relative mb-3">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-sm">No image</span>
          </div>
        )}
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Sold Out</span>
          </div>
        )}
        {discountPct > 0 && product.stock_quantity > 0 && (
          <div
            className="absolute top-2 left-2 px-2 py-0.5 text-xs font-bold text-white rounded"
            style={{ backgroundColor: '#A68B6E' }}
          >
            {discountPct}% OFF
          </div>
        )}
        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <div
            className="absolute bottom-2 left-2 px-2 py-0.5 text-xs text-white rounded"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            Only {product.stock_quantity} left
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm truncate">{product.name}</h3>
      {discountPct > 0 ? (
        <div className="flex items-center gap-2 mt-1">
          <p className="font-semibold text-sm" style={{ color: '#A68B6E' }}>PKR {salePrice!.toLocaleString()}</p>
          <p className="text-xs line-through text-gray-400">PKR {product.price.toLocaleString()}</p>
        </div>
      ) : (
        <p className="font-semibold text-sm mt-1" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString()}</p>
      )}
    </Link>
  )
}
```

- [ ] **Step 2: Create CountdownTimer client component**

Create `store/src/components/sale/CountdownTimer.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'

export default function CountdownTimer({ endsAt }: { endsAt: string }) {
  const [parts, setParts] = useState({ days: 0, hours: 0, mins: 0, secs: 0, ended: false })

  useEffect(() => {
    const update = () => {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) { setParts(p => ({ ...p, ended: true })); return }
      setParts({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
        ended: false,
      })
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [endsAt])

  if (parts.ended) return <p className="text-sm font-medium text-gray-400">Sale has ended</p>

  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className="flex items-center gap-4">
      {(['Days', 'Hours', 'Mins', 'Secs'] as const).map((label, i) => {
        const val = [parts.days, parts.hours, parts.mins, parts.secs][i]
        return (
          <div key={label} className="text-center">
            <div className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{pad(val)}</div>
            <div className="text-xs uppercase tracking-wider" style={{ color: '#A68B6E' }}>{label}</div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Create sale store page**

Create `store/src/app/(store)/sale/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import CountdownTimer from '@/components/sale/CountdownTimer'
import type { Product } from '@/types'

export default async function SalePage() {
  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select(`
      *,
      sale_products(
        *,
        products(id, name, slug, price, images, stock_quantity, sizes, colors, description, sku, is_active, is_bestseller, category_id, created_at, categories(name, slug))
      )
    `)
    .eq('is_active', true)
    .single()

  if (!sale) notFound()

  const saleItems = (sale.sale_products || []) as Array<{ sale_price: number; products: Product }>
  const activeItems = saleItems.filter(sp => sp.products?.is_active && sp.products.stock_quantity >= 0)

  return (
    <div>
      {/* Sale hero */}
      <section className="py-16 text-center" style={{ backgroundColor: '#1C1C1C' }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#A68B6E', letterSpacing: '0.3em' }}>
          Limited Time
        </p>
        <h1 className="text-4xl md:text-5xl text-white mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          {sale.title}
        </h1>
        {sale.description && (
          <p className="text-gray-300 mb-8 max-w-md mx-auto">{sale.description}</p>
        )}
        {sale.ends_at && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs uppercase tracking-wider text-gray-400">Sale ends in</p>
            <CountdownTimer endsAt={sale.ends_at} />
          </div>
        )}
      </section>

      {/* Stats bar */}
      <section className="border-b py-3" style={{ backgroundColor: '#FAF8F5', borderColor: '#E8DDD4' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-2 text-sm text-gray-600">
          <span>✓ Exclusive sale prices</span>
          <span>✓ Flat PKR {Number(sale.delivery_charge).toLocaleString()} delivery nationwide</span>
          <span>✓ Limited stock — first come, first served</span>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-xl mb-8 text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
          {activeItems.length} Item{activeItems.length !== 1 ? 's' : ''} on Sale
        </h2>
        {activeItems.length === 0 ? (
          <p className="text-center text-gray-400 py-16">Products coming soon.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {activeItems.map(sp => (
              <ProductCard key={sp.products.id} product={sp.products} salePrice={sp.sale_price} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Update products.ts to filter sale products + add getBestsellerProducts**

Replace the entire contents of `store/src/lib/products.ts`:

```ts
import { supabase } from './supabase/client'
import type { Product } from '@/types'

async function getSaleProductIds(): Promise<string[]> {
  const { data: activeSale } = await supabase
    .from('sales')
    .select('id')
    .eq('is_active', true)
    .single()
  if (!activeSale) return []
  const { data: saleProducts } = await supabase
    .from('sale_products')
    .select('product_id')
    .eq('sale_id', activeSale.id)
  return (saleProducts || []).map((sp: { product_id: string }) => sp.product_id)
}

export async function getProducts(filters?: {
  minPrice?: number
  maxPrice?: number
  size?: string
  type?: string
}) {
  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice)
  if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)

  const { data, error } = await query
  if (error) throw error

  let products = data as Product[]

  if (filters?.size) {
    products = products.filter(p => p.sizes.includes(filters.size!))
  }

  if (filters?.type === 'unstitched') {
    products = products.filter(p => p.sizes.length === 0 || p.sizes.includes('Unstitched'))
  } else if (filters?.type === 'stitched') {
    products = products.filter(p => p.sizes.length > 0 && !p.sizes.includes('Unstitched'))
  }

  try {
    const saleIds = await getSaleProductIds()
    if (saleIds.length > 0) {
      products = products.filter(p => !saleIds.includes(p.id))
    }
  } catch {
    // Fail open — show all products if sale check fails
  }

  return products
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data as Product
}

export async function getFeaturedProducts(limit = 6) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(limit + 20)

  if (error) throw error
  let products = data as Product[]

  try {
    const saleIds = await getSaleProductIds()
    if (saleIds.length > 0) {
      products = products.filter(p => !saleIds.includes(p.id))
    }
  } catch {
    // Fail open
  }

  return products.slice(0, limit)
}

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

- [ ] **Step 5: Add sale banner + best sellers to homepage**

Replace the entire contents of `store/src/app/(store)/page.tsx`:

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/products/ProductCard'
import { getFeaturedProducts, getBestsellerProducts } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Truck, RefreshCw, MapPin, Banknote, MessageCircle } from 'lucide-react'
import type { Sale } from '@/types'

async function getHeroImage(): Promise<string> {
  try {
    const { data } = await supabaseAdmin.from('store_settings').select('value').eq('key', 'hero_image').single()
    return data?.value || ''
  } catch { return '' }
}

async function getActiveSale(): Promise<Sale | null> {
  try {
    const { data } = await supabaseAdmin.from('sales').select('*').eq('is_active', true).single()
    return data || null
  } catch { return null }
}

export default async function HomePage() {
  type FeaturedList = Awaited<ReturnType<typeof getFeaturedProducts>>
  let featured: FeaturedList = []
  let bestsellers: FeaturedList = []
  let heroImage = ''
  let activeSale: Sale | null = null

  try {
    ;[featured, bestsellers, heroImage, activeSale] = await Promise.all([
      getFeaturedProducts(6),
      getBestsellerProducts(6),
      getHeroImage(),
      getActiveSale(),
    ])
  } catch {
    // Supabase not configured — show empty state
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center text-center overflow-hidden" style={{ minHeight: '85vh', backgroundColor: '#E8DDD4' }}>
        {heroImage && (
          <Image src={heroImage} alt="ZADIIS Hero Banner" fill className="object-cover" priority />
        )}
        <div
          className="relative z-10 px-4"
          style={heroImage ? { backgroundColor: 'rgba(0,0,0,0.35)', padding: '40px 32px', borderRadius: '8px' } : {}}
        >
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
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={16} style={{ color: '#A68B6E' }} />Free delivery over PKR 2,000</div>
          <div className="flex items-center gap-2"><Banknote size={16} style={{ color: '#A68B6E' }} />Cash on Delivery available</div>
          <div className="flex items-center gap-2"><RefreshCw size={16} style={{ color: '#A68B6E' }} />7-day easy exchange</div>
          <div className="flex items-center gap-2"><MapPin size={16} style={{ color: '#A68B6E' }} />Nationwide delivery</div>
          <div className="flex items-center gap-2"><MessageCircle size={16} style={{ color: '#A68B6E' }} />WhatsApp support</div>
        </div>
      </section>

      {/* Sale Banner — only shown when a sale is active */}
      {activeSale && (
        <section className="py-12 text-center" style={{ backgroundColor: '#1C1C1C' }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#A68B6E', letterSpacing: '0.3em' }}>Limited Time</p>
          <h2 className="text-3xl text-white mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            {activeSale.title}
          </h2>
          {activeSale.description && (
            <p className="text-gray-300 mb-6 max-w-sm mx-auto text-sm">{activeSale.description}</p>
          )}
          <Button asChild size="lg" className="text-white px-10 rounded-none uppercase tracking-widest text-sm" style={{ backgroundColor: '#A68B6E' }}>
            <Link href="/sale">Shop Sale</Link>
          </Button>
        </section>
      )}

      {/* Best Sellers — only rendered when at least one product has is_bestseller=true */}
      {bestsellers.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl text-center mb-10" style={{ fontFamily: 'Playfair Display, serif' }}>Most Loved</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {bestsellers.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
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

- [ ] **Step 6: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Manual verification**

Run `npm run dev`:
1. Activate a sale with at least 2 products in admin
2. `http://localhost:3000` — sale banner appears (dark section with title + Shop Sale button)
3. `http://localhost:3000/sale` — hero with title, countdown if `ends_at` set, stats bar, product grid with `X% OFF` badge + strikethrough original price
4. `http://localhost:3000/shop` — sale products do NOT appear in the grid
5. Deactivate sale in admin → `/sale` returns 404, home banner gone, shop shows all products again
6. Product cards without `salePrice` show original price only (no badge)

- [ ] **Step 8: Commit**

```bash
git add store/src/components/sale/ store/src/app/\(store\)/sale/ store/src/components/products/ProductCard.tsx store/src/lib/products.ts store/src/app/\(store\)/page.tsx
git commit -m "feat: sale page (countdown, stats bar, product grid), homepage sale banner + best sellers, shop filter excludes sale products"
```

---

### Task 7: Best Sellers Admin Toggle

**Files:**
- Modify: `store/src/app/admin/products/new/page.tsx`
- Modify: `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`

The products API (`/api/admin/products`) already accepts any field via `...body` spread — no API changes needed.

**Interfaces:**
- Consumes: `Product.is_bestseller` from Task 3
- Produces: Admin can mark products as bestsellers → shown in "Most Loved" section on homepage

- [ ] **Step 1: Add is_bestseller to new product form**

In `store/src/app/admin/products/new/page.tsx`:

**a.** Add `is_bestseller: false` to the initial `form` state:
```tsx
const [form, setForm] = useState({
  name: '',
  sku: '',
  description: '',
  price: '',
  stock_quantity: '',
  images: [] as string[],
  colors: '',
  sizes: [] as string[],
  category_id: '',
  is_active: true,
  is_bestseller: false,
})
```

**b.** Add `is_bestseller: form.is_bestseller` to the JSON body in `handleSubmit`.

**c.** Add a checkbox after the `is_active` checkbox (before the submit Button):
```tsx
<div className="flex items-center gap-3">
  <input
    type="checkbox"
    id="is_bestseller"
    checked={form.is_bestseller}
    onChange={e => set('is_bestseller', e.target.checked)}
    className="w-4 h-4"
  />
  <Label htmlFor="is_bestseller">Best Seller (shown in &quot;Most Loved&quot; on homepage)</Label>
</div>
```

- [ ] **Step 2: Add is_bestseller to edit product form**

In `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`:

**a.** Add `is_bestseller: product.is_bestseller` to the initial `form` state.

**b.** Add `is_bestseller: form.is_bestseller` to the JSON body in `handleSubmit`.

**c.** Add the same checkbox as in Step 1 (after the `is_active` checkbox):
```tsx
<div className="flex items-center gap-3">
  <input
    type="checkbox"
    id="is_bestseller"
    checked={form.is_bestseller}
    onChange={e => set('is_bestseller', e.target.checked)}
    className="w-4 h-4"
  />
  <Label htmlFor="is_bestseller">Best Seller (shown in &quot;Most Loved&quot; on homepage)</Label>
</div>
```

- [ ] **Step 3: TypeScript check**

```bash
cd store && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual verification**

1. `/admin/products` → edit any product → check "Best Seller" → save
2. `http://localhost:3000` → "Most Loved" section appears with that product
3. Uncheck "Best Seller" → save → "Most Loved" section disappears from homepage

- [ ] **Step 5: Commit**

```bash
git add store/src/app/admin/products/new/page.tsx "store/src/app/admin/products/[id]/edit/EditProductForm.tsx"
git commit -m "feat: admin bestseller toggle on products — drives Most Loved section on homepage"
```

---

## Summary

| Task | Deliverable | Time estimate |
|---|---|---|
| 1 | Trust bar (5 items), policy pages, footer links | 1 hour |
| 2 | SEO: OG metadata, sitemap, robots, product JSON-LD | 1 hour |
| 3 | DB migration + TypeScript types | 30 min |
| 4 | Admin sales: create, edit, manage products, toggle | 2 hours |
| 5 | Public API, delivery override, checkout, emails | 1.5 hours |
| 6 | Sale page, homepage banner, shop filter, ProductCard | 1.5 hours |
| 7 | Admin bestseller toggle | 30 min |

**After all tasks:** Run full TypeScript check, test the complete sale flow (admin creates sale → adds products → activates → customer visits `/sale` → adds to cart → checkout shows flat delivery → order placed with `is_sale=true` → owner receives sale email), then deactivate and confirm shop returns to normal.
