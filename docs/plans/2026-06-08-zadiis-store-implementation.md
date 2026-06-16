# ZADIIS Store Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete Pakistani women's fashion ecommerce store with product catalog, cart, online payments, order email notifications, and an admin panel with sales analytics.

**Architecture:** Next.js App Router with TypeScript for full-stack (frontend + API routes in one codebase). Supabase PostgreSQL for data storage. Safepay for Pakistani payment gateway. Resend for transactional email. Custom password-protected admin panel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Shadcn/UI, Supabase, Safepay, Resend, Recharts (admin charts), Vercel (hosting)

**Design Reference:** `docs/plans/2026-06-08-zadiis-store-design.md`

---

## Phase 1: Project Setup

### Task 1: Initialize Next.js Project

**Files:**
- Create: `store/` (project root for Next.js app)

**Step 1: Scaffold the project**

```bash
cd /c/Users/QC/Desktop/ecom-business-project
npx create-next-app@latest store --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd store
```

**Step 2: Verify it runs**

```bash
npm run dev
```
Expected: Server running at `http://localhost:3000` with default Next.js page.

**Step 3: Commit**

```bash
git add store/
git commit -m "feat: initialize Next.js project for ZADIIS store"
```

---

### Task 2: Install Dependencies

**Files:**
- Modify: `store/package.json`

**Step 1: Install Shadcn/UI**

```bash
cd store
npx shadcn@latest init
```
When prompted:
- Style: Default
- Base color: Stone
- CSS variables: Yes

**Step 2: Install core Shadcn components**

```bash
npx shadcn@latest add button card input label sheet badge separator skeleton toast dialog
```

**Step 3: Install remaining dependencies**

```bash
npm install @supabase/supabase-js resend recharts lucide-react next-themes
npm install -D @types/node
```

**Step 4: Verify no errors**

```bash
npm run build
```
Expected: Build succeeds with no TypeScript errors.

**Step 5: Commit**

```bash
git add store/package.json store/package-lock.json store/components.json
git commit -m "feat: install shadcn/ui, supabase, resend, recharts dependencies"
```

---

### Task 3: Environment Variables Setup

**Files:**
- Create: `store/.env.local`
- Create: `store/.env.example`

**Step 1: Create .env.local**

```bash
cat > store/.env.local << 'EOF'
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Resend
RESEND_API_KEY=your_resend_api_key
OWNER_EMAIL=your_email@gmail.com

# Admin
ADMIN_PASSWORD=choose_a_strong_password

# Safepay
SAFEPAY_API_KEY=your_safepay_api_key
SAFEPAY_SECRET_KEY=your_safepay_secret_key
NEXT_PUBLIC_SAFEPAY_ENV=sandbox

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**Step 2: Create .env.example (safe to commit)**

```bash
cat > store/.env.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
OWNER_EMAIL=
ADMIN_PASSWORD=
SAFEPAY_API_KEY=
SAFEPAY_SECRET_KEY=
NEXT_PUBLIC_SAFEPAY_ENV=sandbox
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF
```

**Step 3: Ensure .env.local is gitignored**

```bash
grep ".env.local" store/.gitignore
```
Expected: `.env.local` line present. If not, add it.

**Step 4: Commit only the example**

```bash
git add store/.env.example
git commit -m "chore: add environment variables template"
```

---

### Task 4: Supabase Database Schema

**Files:**
- Create: `store/supabase/schema.sql`

**Step 1: Create schema file**

```sql
-- store/supabase/schema.sql

-- Categories
create table categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Products
create table products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text not null unique,
  description text,
  price decimal(10,2) not null,
  category_id uuid references categories(id),
  images text[] default '{}',
  sizes text[] default '{}',
  colors text[] default '{}',
  stock_quantity integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Orders
create table orders (
  id uuid default gen_random_uuid() primary key,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  address text not null,
  city text not null,
  items jsonb not null,
  subtotal decimal(10,2) not null,
  total decimal(10,2) not null,
  payment_method text not null check (payment_method in ('jazzcash', 'easypaisa', 'card', 'cod')),
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  order_status text default 'new' check (order_status in ('new', 'processing', 'shipped', 'delivered', 'returned')),
  created_at timestamptz default now()
);

-- Seed initial category
insert into categories (name, slug) values ('Women''s Clothing', 'womens-clothing');
```

**Step 2: Run in Supabase**

Go to your Supabase project → SQL Editor → paste the schema → Run.

Expected: All 3 tables created, 1 category seeded.

**Step 3: Commit schema**

```bash
git add store/supabase/schema.sql
git commit -m "feat: add supabase database schema"
```

---

### Task 5: Supabase Client Setup

**Files:**
- Create: `store/src/lib/supabase/client.ts`
- Create: `store/src/lib/supabase/server.ts`

**Step 1: Create browser client**

```typescript
// store/src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Step 2: Create server client**

```typescript
// store/src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**Step 3: Commit**

```bash
git add store/src/lib/
git commit -m "feat: add supabase client utilities"
```

---

## Phase 2: Global Layout & Theme

### Task 6: Global Styles & Fonts

**Files:**
- Modify: `store/src/app/globals.css`
- Modify: `store/src/app/layout.tsx`

**Step 1: Update globals.css with brand colors**

```css
/* store/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

@layer base {
  :root {
    --background: 43 33% 97%;
    --foreground: 0 0% 11%;
    --primary: 25 30% 56%;
    --primary-foreground: 0 0% 100%;
    --accent: 25 25% 60%;
    --card: 0 0% 100%;
    --border: 25 15% 88%;
    --ring: 25 30% 56%;
  }

  body {
    @apply bg-[#FAF8F5] text-[#1C1C1C] font-['Inter'];
  }

  h1, h2, h3 {
    @apply font-['Playfair_Display'];
  }
}
```

**Step 2: Update root layout**

```typescript
// store/src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

export const metadata: Metadata = {
  title: 'ZADIIS — Women\'s Fashion',
  description: 'Discover the latest women\'s fashion at ZADIIS. Shop kurtas, dresses, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/globals.css store/src/app/layout.tsx
git commit -m "feat: add brand theme colors and typography"
```

---

### Task 7: Header Component

**Files:**
- Create: `store/src/components/layout/Header.tsx`
- Create: `store/src/lib/cart-store.ts`

**Step 1: Create cart store (Zustand-free, use localStorage)**

```typescript
// store/src/lib/cart-store.ts
export type CartItem = {
  id: string
  name: string
  price: number
  image: string
  size: string
  color: string
  quantity: number
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return []
  const cart = localStorage.getItem('zadiis-cart')
  return cart ? JSON.parse(cart) : []
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem('zadiis-cart', JSON.stringify(items))
}

export function addToCart(item: CartItem) {
  const cart = getCart()
  const existing = cart.find(i => i.id === item.id && i.size === item.size && i.color === item.color)
  if (existing) {
    existing.quantity += item.quantity
  } else {
    cart.push(item)
  }
  saveCart(cart)
}

export function removeFromCart(id: string, size: string, color: string) {
  const cart = getCart().filter(i => !(i.id === id && i.size === size && i.color === color))
  saveCart(cart)
}

export function getCartCount(): number {
  return getCart().reduce((sum, i) => sum + i.quantity, 0)
}

export function clearCart() {
  localStorage.removeItem('zadiis-cart')
}
```

**Step 2: Create Header component**

```typescript
// store/src/components/layout/Header.tsx
'use client'
import Link from 'next/link'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getCartCount } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'

export default function Header() {
  const [cartCount, setCartCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setCartCount(getCartCount())
    const handler = () => setCartCount(getCartCount())
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [])

  return (
    <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur border-b border-[#E8DDD4]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-['Playfair_Display'] text-xl font-bold tracking-widest uppercase">
          ZADIIS
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <Link href="/shop" className="hover:text-[#A68B6E] transition-colors">Shop</Link>
          <Link href="/about" className="hover:text-[#A68B6E] transition-colors">About</Link>
          <Link href="/contact" className="hover:text-[#A68B6E] transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative p-2">
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#A68B6E] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-[#E8DDD4] bg-[#FAF8F5] px-4 py-4 flex flex-col gap-4 text-sm font-medium">
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link href="/about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
        </div>
      )}
    </header>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/components/ store/src/lib/cart-store.ts
git commit -m "feat: add header with cart icon and mobile menu"
```

---

### Task 8: Footer & WhatsApp Button

**Files:**
- Create: `store/src/components/layout/Footer.tsx`
- Create: `store/src/components/layout/WhatsAppButton.tsx`

**Step 1: Create Footer**

```typescript
// store/src/components/layout/Footer.tsx
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="bg-[#1C1C1C] text-white mt-20">
      <div className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h3 className="font-['Playfair_Display'] text-xl mb-3">ZADIIS</h3>
          <p className="text-sm text-gray-400">Modern Pakistani women's fashion. Quality you can feel.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Shop</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/shop" className="hover:text-white">All Products</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Help</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><Link href="/contact" className="hover:text-white">WhatsApp Support</Link></li>
            <li>Free delivery on orders over PKR 2,000</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-gray-800 text-center py-4 text-xs text-gray-500">
        © {new Date().getFullYear()} ZADIIS. All rights reserved.
      </div>
    </footer>
  )
}
```

**Step 2: Create WhatsApp floating button**

```typescript
// store/src/components/layout/WhatsAppButton.tsx
'use client'
import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923001234567'
  const message = encodeURIComponent('Hi! I have a question about my order.')

  return (
    <a
      href={`https://wa.me/${phone}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition-transform hover:scale-110"
      aria-label="Chat on WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  )
}
```

**Step 3: Add NEXT_PUBLIC_WHATSAPP_NUMBER to .env.example**

```bash
echo "NEXT_PUBLIC_WHATSAPP_NUMBER=923001234567" >> store/.env.example
```

**Step 4: Create store layout wrapping all store pages**

```typescript
// store/src/app/(store)/layout.tsx
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import WhatsAppButton from '@/components/layout/WhatsAppButton'

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  )
}
```

**Step 5: Commit**

```bash
git add store/src/
git commit -m "feat: add footer, whatsapp button, store layout"
```

---

## Phase 3: Product Catalog

### Task 9: Product Types & Utilities

**Files:**
- Create: `store/src/types/index.ts`
- Create: `store/src/lib/products.ts`

**Step 1: Create types**

```typescript
// store/src/types/index.ts
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
  is_active: boolean
  created_at: string
  categories?: Category
}

export type Order = {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  address: string
  city: string
  items: OrderItem[]
  subtotal: number
  total: number
  payment_method: 'jazzcash' | 'easypaisa' | 'card' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed'
  order_status: 'new' | 'processing' | 'shipped' | 'delivered' | 'returned'
  created_at: string
}

export type OrderItem = {
  product_id: string
  product_name: string
  size: string
  color: string
  quantity: number
  price: number
}
```

**Step 2: Create product fetch utilities**

```typescript
// store/src/lib/products.ts
import { supabase } from './supabase/client'
import type { Product } from '@/types'

export async function getProducts(filters?: {
  category?: string
  minPrice?: number
  maxPrice?: number
  size?: string
  color?: string
}) {
  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (filters?.minPrice) query = query.gte('price', filters.minPrice)
  if (filters?.maxPrice) query = query.lte('price', filters.maxPrice)

  const { data, error } = await query
  if (error) throw error
  return data as Product[]
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
    .limit(limit)

  if (error) throw error
  return data as Product[]
}
```

**Step 3: Commit**

```bash
git add store/src/types/ store/src/lib/products.ts
git commit -m "feat: add product types and fetch utilities"
```

---

### Task 10: Product Card Component

**Files:**
- Create: `store/src/components/products/ProductCard.tsx`

**Step 1: Create ProductCard**

```typescript
// store/src/components/products/ProductCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images[0] || '/placeholder.jpg'

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg bg-white aspect-[3/4] relative mb-3">
        <Image
          src={image}
          alt={product.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 50vw, 33vw"
        />
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Sold Out</span>
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm truncate">{product.name}</h3>
      <p className="text-[#A68B6E] font-semibold text-sm mt-1">PKR {product.price.toLocaleString()}</p>
    </Link>
  )
}
```

**Step 2: Commit**

```bash
git add store/src/components/products/
git commit -m "feat: add product card component"
```

---

### Task 11: Home Page

**Files:**
- Create: `store/src/app/(store)/page.tsx`

**Step 1: Create Home page**

```typescript
// store/src/app/(store)/page.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/products/ProductCard'
import { getFeaturedProducts } from '@/lib/products'
import { Truck, RefreshCw, Shield } from 'lucide-react'

export default async function HomePage() {
  const featured = await getFeaturedProducts(6)

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[85vh] bg-[#E8DDD4] flex items-center justify-center text-center overflow-hidden">
        <div className="relative z-10 px-4">
          <p className="text-sm uppercase tracking-[0.3em] text-[#A68B6E] mb-4">New Collection</p>
          <h1 className="text-4xl md:text-6xl font-['Playfair_Display'] font-bold mb-6 leading-tight">
            Dressed in<br />Confidence
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Discover women's fashion crafted for the modern Pakistani woman.
          </p>
          <Button asChild size="lg" className="bg-[#1C1C1C] hover:bg-[#A68B6E] text-white px-10 rounded-none uppercase tracking-widest text-sm">
            <Link href="/shop">Shop Now</Link>
          </Button>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y border-[#E8DDD4] py-4 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} className="text-[#A68B6E]" /> Free delivery over PKR 2,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} className="text-[#A68B6E]" /> Easy returns</div>
          <div className="flex items-center gap-2"><Shield size={18} className="text-[#A68B6E]" /> Secure payments</div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl font-['Playfair_Display'] text-center mb-10">New Arrivals</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {featured.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="text-center mt-10">
          <Button asChild variant="outline" className="border-[#1C1C1C] rounded-none uppercase tracking-widest text-sm px-10">
            <Link href="/shop">View All</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add store/src/app/
git commit -m "feat: add home page with hero and featured products"
```

---

### Task 12: Shop Page (Product Listing)

**Files:**
- Create: `store/src/app/(store)/shop/page.tsx`
- Create: `store/src/components/products/ProductFilters.tsx`

**Step 1: Create ProductFilters**

```typescript
// store/src/components/products/ProductFilters.tsx
'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PRICE_RANGES = [
  { label: 'Under PKR 2,000', min: 0, max: 2000 },
  { label: 'PKR 2,000 – 5,000', min: 2000, max: 5000 },
  { label: 'PKR 5,000 – 10,000', min: 5000, max: 10000 },
  { label: 'Over PKR 10,000', min: 10000, max: 999999 },
]

export default function ProductFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const update = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (p.get(key) === value) p.delete(key)
    else p.set(key, value)
    router.push(`/shop?${p.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(size => (
            <button
              key={size}
              onClick={() => update('size', size)}
              className={`px-3 py-1 text-sm border rounded ${params.get('size') === size ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'border-gray-300 hover:border-[#A68B6E]'}`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Price</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map(range => (
            <button
              key={range.label}
              onClick={() => { update('min', String(range.min)); update('max', String(range.max)) }}
              className="block text-sm text-left hover:text-[#A68B6E] transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Create Shop page**

```typescript
// store/src/app/(store)/shop/page.tsx
import ProductCard from '@/components/products/ProductCard'
import ProductFilters from '@/components/products/ProductFilters'
import { getProducts } from '@/lib/products'

export default async function ShopPage({ searchParams }: { searchParams: { size?: string; min?: string; max?: string } }) {
  const products = await getProducts({
    size: searchParams.size,
    minPrice: searchParams.min ? Number(searchParams.min) : undefined,
    maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
  })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-['Playfair_Display'] mb-8">Women's Collection</h1>
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-56 shrink-0">
          <ProductFilters />
        </aside>
        <div className="flex-1">
          {products.length === 0 ? (
            <p className="text-gray-500">No products found. Try adjusting your filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/\(store\)/shop/ store/src/components/products/ProductFilters.tsx
git commit -m "feat: add shop page with product grid and filters"
```

---

### Task 13: Product Detail Page

**Files:**
- Create: `store/src/app/(store)/shop/[slug]/page.tsx`
- Create: `store/src/components/products/AddToCartButton.tsx`

**Step 1: Create AddToCartButton**

```typescript
// store/src/components/products/AddToCartButton.tsx
'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/lib/cart-store'
import { useToast } from '@/components/ui/use-toast'
import type { Product } from '@/types'

export default function AddToCartButton({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const { toast } = useToast()

  const handleAdd = () => {
    if (!selectedSize) return toast({ title: 'Please select a size', variant: 'destructive' })
    if (!selectedColor) return toast({ title: 'Please select a color', variant: 'destructive' })

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0] || '',
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
    })
    window.dispatchEvent(new Event('cart-updated'))
    toast({ title: 'Added to cart!', description: `${product.name} — ${selectedSize}, ${selectedColor}` })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">Size</p>
        <div className="flex flex-wrap gap-2">
          {product.sizes.map(size => (
            <button key={size} onClick={() => setSelectedSize(size)}
              className={`px-4 py-2 text-sm border rounded ${selectedSize === size ? 'bg-[#1C1C1C] text-white' : 'border-gray-300 hover:border-[#A68B6E]'}`}>
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium mb-2">Color</p>
        <div className="flex flex-wrap gap-2">
          {product.colors.map(color => (
            <button key={color} onClick={() => setSelectedColor(color)}
              className={`px-4 py-2 text-sm border rounded ${selectedColor === color ? 'bg-[#1C1C1C] text-white' : 'border-gray-300 hover:border-[#A68B6E]'}`}>
              {color}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={handleAdd} disabled={product.stock_quantity === 0}
        className="w-full bg-[#1C1C1C] hover:bg-[#A68B6E] text-white rounded-none uppercase tracking-widest py-6">
        {product.stock_quantity === 0 ? 'Sold Out' : 'Add to Cart'}
      </Button>
    </div>
  )
}
```

**Step 2: Create Product Detail page**

```typescript
// store/src/app/(store)/shop/[slug]/page.tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import AddToCartButton from '@/components/products/AddToCartButton'

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductBySlug(params.slug).catch(() => null)
  if (!product) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white">
            <Image src={product.images[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.slice(1).map((img, i) => (
              <div key={i} className="aspect-square relative rounded overflow-hidden bg-white">
                <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-['Playfair_Display'] font-bold">{product.name}</h1>
            <p className="text-2xl text-[#A68B6E] font-semibold mt-2">PKR {product.price.toLocaleString()}</p>
          </div>
          <p className="text-gray-600 leading-relaxed">{product.description}</p>
          <AddToCartButton product={product} />
          <p className="text-xs text-gray-400">Free delivery on orders over PKR 2,000</p>
        </div>
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/\(store\)/shop/\[slug\]/ store/src/components/products/AddToCartButton.tsx
git commit -m "feat: add product detail page with add to cart"
```

---

## Phase 4: Cart & Checkout

### Task 14: Cart Page

**Files:**
- Create: `store/src/app/(store)/cart/page.tsx`

**Step 1: Create Cart page**

```typescript
// store/src/app/(store)/cart/page.tsx
'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCart, removeFromCart, saveCart, type CartItem } from '@/lib/cart-store'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => { setItems(getCart()) }, [])

  const remove = (id: string, size: string, color: string) => {
    removeFromCart(id, size, color)
    setItems(getCart())
    window.dispatchEvent(new Event('cart-updated'))
  }

  const updateQty = (id: string, size: string, color: string, qty: number) => {
    const cart = getCart().map(i =>
      i.id === id && i.size === size && i.color === color ? { ...i, quantity: qty } : i
    ).filter(i => i.quantity > 0)
    saveCart(cart)
    setItems(cart)
    window.dispatchEvent(new Event('cart-updated'))
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (items.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-['Playfair_Display'] mb-4">Your cart is empty</h1>
      <Button asChild className="bg-[#1C1C1C] text-white rounded-none uppercase tracking-widest">
        <Link href="/shop">Continue Shopping</Link>
      </Button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-['Playfair_Display'] mb-8">Shopping Cart</h1>
      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4 bg-white p-4 rounded-lg">
            <div className="w-20 h-24 relative rounded overflow-hidden shrink-0">
              <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.size} · {item.color}</p>
              <p className="text-[#A68B6E] font-semibold mt-1">PKR {item.price.toLocaleString()}</p>
              <div className="flex items-center gap-3 mt-2">
                <button onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100">−</button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)} className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100">+</button>
              </div>
            </div>
            <button onClick={() => remove(item.id, item.size, item.color)} className="text-gray-400 hover:text-red-500">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg">
        <div className="flex justify-between font-semibold text-lg mb-4">
          <span>Total</span>
          <span>PKR {total.toLocaleString()}</span>
        </div>
        <Button asChild className="w-full bg-[#1C1C1C] hover:bg-[#A68B6E] text-white rounded-none uppercase tracking-widest py-6">
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add store/src/app/\(store\)/cart/
git commit -m "feat: add cart page with quantity controls"
```

---

### Task 15: Checkout Page

**Files:**
- Create: `store/src/app/(store)/checkout/page.tsx`
- Create: `store/src/app/api/orders/route.ts`

**Step 1: Create Orders API route**

```typescript
// store/src/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert([body])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send email to owner
  await resend.emails.send({
    from: 'orders@zadiis.com',
    to: process.env.OWNER_EMAIL!,
    subject: `New Order #${order.id.slice(0, 8).toUpperCase()} — PKR ${order.total.toLocaleString()}`,
    html: `
      <h2>New Order Received!</h2>
      <p><strong>Order ID:</strong> ${order.id}</p>
      <p><strong>Customer:</strong> ${order.customer_name}</p>
      <p><strong>Phone:</strong> ${order.customer_phone}</p>
      <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
      <p><strong>Payment:</strong> ${order.payment_method}</p>
      <h3>Items:</h3>
      <ul>${order.items.map((i: any) => `<li>${i.product_name} — ${i.size}, ${i.color} × ${i.quantity} — PKR ${i.price.toLocaleString()}</li>`).join('')}</ul>
      <p><strong>Total: PKR ${order.total.toLocaleString()}</strong></p>
    `,
  })

  return NextResponse.json({ orderId: order.id })
}
```

**Step 2: Create Checkout page**

```typescript
// store/src/app/(store)/checkout/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCart, clearCart } from '@/lib/cart-store'

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Other']
const PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'card', label: 'Credit / Debit Card' },
]

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', payment: '' })

  const items = getCart()
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  useEffect(() => { if (items.length === 0) router.push('/cart') }, [])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.payment) return alert('Please select a payment method')
    setLoading(true)

    const orderItems = items.map(i => ({
      product_id: i.id,
      product_name: i.name,
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
        city: form.city,
        items: orderItems,
        subtotal: total,
        total,
        payment_method: form.payment,
      }),
    })

    const data = await res.json()
    if (data.orderId) {
      clearCart()
      window.dispatchEvent(new Event('cart-updated'))
      router.push(`/order/${data.orderId}`)
    } else {
      alert('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-['Playfair_Display'] mb-8">Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label>Full Name *</Label><Input required value={form.name} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>Phone *</Label><Input required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} /></div>
        </div>
        <div><Label>Email (optional)</Label><Input type="email" value={form.email} onChange={e => set('email', e.target.value)} /></div>
        <div><Label>Delivery Address *</Label><Input required value={form.address} onChange={e => set('address', e.target.value)} /></div>
        <div>
          <Label>City *</Label>
          <select required value={form.city} onChange={e => set('city', e.target.value)} className="w-full border rounded px-3 py-2 text-sm mt-1">
            <option value="">Select city</option>
            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <Label className="block mb-2">Payment Method *</Label>
          <div className="grid grid-cols-1 gap-2">
            {PAYMENT_METHODS.map(m => (
              <label key={m.id} className={`flex items-center gap-3 border rounded p-3 cursor-pointer ${form.payment === m.id ? 'border-[#1C1C1C] bg-gray-50' : 'border-gray-200'}`}>
                <input type="radio" name="payment" value={m.id} checked={form.payment === m.id} onChange={() => set('payment', m.id)} />
                {m.label}
              </label>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border">
          <div className="flex justify-between font-semibold">
            <span>Order Total</span>
            <span>PKR {total.toLocaleString()}</span>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="w-full bg-[#1C1C1C] hover:bg-[#A68B6E] text-white rounded-none uppercase tracking-widest py-6">
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </form>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/\(store\)/checkout/ store/src/app/api/
git commit -m "feat: add checkout page and order API with email notification"
```

---

### Task 16: Order Confirmation Page

**Files:**
- Create: `store/src/app/(store)/order/[id]/page.tsx`

**Step 1: Create confirmation page**

```typescript
// store/src/app/(store)/order/[id]/page.tsx
import { supabase } from '@/lib/supabase/client'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function OrderConfirmationPage({ params }: { params: { id: string } }) {
  const { data: order } = await supabase.from('orders').select('*').eq('id', params.id).single()
  if (!order) return <div className="text-center py-20">Order not found.</div>

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <CheckCircle size={56} className="text-green-500 mx-auto mb-4" />
      <h1 className="text-2xl font-['Playfair_Display'] font-bold mb-2">Order Placed!</h1>
      <p className="text-gray-500 mb-1">Thank you, {order.customer_name}</p>
      <p className="text-sm text-gray-400 mb-8">Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>

      <div className="bg-white rounded-lg p-5 text-left mb-8 border">
        <h2 className="font-semibold mb-3">Order Summary</h2>
        {order.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-sm py-1 border-b last:border-0">
            <span>{item.product_name} × {item.quantity} ({item.size}, {item.color})</span>
            <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold mt-3">
          <span>Total</span>
          <span>PKR {order.total.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">We'll contact you on <strong>{order.customer_phone}</strong> to confirm delivery.</p>
      <Button asChild className="bg-[#1C1C1C] text-white rounded-none uppercase tracking-widest">
        <Link href="/shop">Continue Shopping</Link>
      </Button>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add store/src/app/\(store\)/order/
git commit -m "feat: add order confirmation page"
```

---

## Phase 5: About & Contact Pages

### Task 17: About & Contact Pages

**Files:**
- Create: `store/src/app/(store)/about/page.tsx`
- Create: `store/src/app/(store)/contact/page.tsx`

**Step 1: About page**

```typescript
// store/src/app/(store)/about/page.tsx
export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-['Playfair_Display'] mb-6">Our Story</h1>
      <div className="prose prose-gray space-y-4 text-gray-600 leading-relaxed">
        <p>ZADIIS was born from a simple belief — every Pakistani woman deserves to feel confident, beautiful, and effortlessly stylish.</p>
        <p>We curate women's clothing that blends contemporary style with the elegance of South Asian fashion. Each piece is selected with care, designed to move with you through your day.</p>
        <p>This is just the beginning. We're building something special — a brand that grows with you.</p>
      </div>
    </div>
  )
}
```

**Step 2: Contact page**

```typescript
// store/src/app/(store)/contact/page.tsx
import { MessageCircle } from 'lucide-react'

export default function ContactPage() {
  const phone = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '923001234567'

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-['Playfair_Display'] mb-4">Get in Touch</h1>
      <p className="text-gray-500 mb-8">Have a question about an order or product? We're here to help.</p>
      <a
        href={`https://wa.me/${phone}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-full font-medium transition-colors"
      >
        <MessageCircle size={20} />
        Chat on WhatsApp
      </a>
      <p className="text-sm text-gray-400 mt-6">We usually reply within a few hours</p>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/\(store\)/about/ store/src/app/\(store\)/contact/
git commit -m "feat: add about and contact pages"
```

---

## Phase 6: Admin Panel

### Task 18: Admin Authentication

**Files:**
- Create: `store/src/app/admin/login/page.tsx`
- Create: `store/src/app/api/admin/auth/route.ts`
- Create: `store/src/middleware.ts`

**Step 1: Create auth API**

```typescript
// store/src/app/api/admin/auth/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }
  const res = NextResponse.json({ success: true })
  res.cookies.set('admin-auth', process.env.ADMIN_PASSWORD!, { httpOnly: true, maxAge: 60 * 60 * 24 * 7 })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ success: true })
  res.cookies.delete('admin-auth')
  return res
}
```

**Step 2: Create middleware to protect /admin routes**

```typescript
// store/src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
    const auth = req.cookies.get('admin-auth')
    if (!auth || auth.value !== process.env.ADMIN_PASSWORD) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin/:path*'] }
```

**Step 3: Create login page**

```typescript
// store/src/app/admin/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
    if (res.ok) router.push('/admin')
    else setError('Invalid password')
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm w-full max-w-sm">
        <h1 className="text-2xl font-['Playfair_Display'] text-center mb-6">Admin Login</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full bg-[#1C1C1C] text-white rounded-none">Login</Button>
        </form>
      </div>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add store/src/app/admin/ store/src/middleware.ts store/src/app/api/admin/
git commit -m "feat: add admin authentication and route protection"
```

---

### Task 19: Admin Layout & Dashboard

**Files:**
- Create: `store/src/app/admin/layout.tsx`
- Create: `store/src/app/admin/page.tsx`
- Create: `store/src/components/admin/DashboardCharts.tsx`

**Step 1: Create admin layout**

```typescript
// store/src/app/admin/layout.tsx
import Link from 'next/link'
import { LayoutDashboard, Package, ShoppingBag, LogOut } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 bg-[#1C1C1C] text-white flex flex-col py-6 px-4 gap-1 shrink-0">
        <h2 className="font-['Playfair_Display'] text-lg px-2 mb-6">ZADIIS Admin</h2>
        <Link href="/admin" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm"><LayoutDashboard size={16} />Dashboard</Link>
        <Link href="/admin/products" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm"><Package size={16} />Products</Link>
        <Link href="/admin/orders" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm"><ShoppingBag size={16} />Orders</Link>
        <div className="mt-auto">
          <form action="/api/admin/auth" method="DELETE">
            <Link href="/admin/login" className="flex items-center gap-3 px-2 py-2 rounded hover:bg-white/10 text-sm text-gray-400"><LogOut size={16} />Logout</Link>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
```

**Step 2: Create dashboard charts component**

```typescript
// store/src/components/admin/DashboardCharts.tsx
'use client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { Order } from '@/types'

const COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355', '#D4B896', '#6B5744']

export default function DashboardCharts({ orders }: { orders: Order[] }) {
  // Monthly revenue & orders (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return { month: d.toLocaleString('default', { month: 'short' }), year: d.getFullYear(), monthNum: d.getMonth() }
  })

  const monthlyData = months.map(m => {
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

  // Color sales data
  const colorMap: Record<string, number> = {}
  orders.forEach(o => o.items.forEach((i: any) => {
    colorMap[i.color] = (colorMap[i.color] || 0) + i.quantity
  }))
  const colorData = Object.entries(colorMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6)

  return (
    <div className="space-y-8">
      {/* Revenue Bar Chart */}
      <div className="bg-white rounded-lg p-5 border">
        <h3 className="font-semibold mb-4">Monthly Revenue (PKR)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `PKR ${v.toLocaleString()}`} />
            <Bar dataKey="revenue" fill="#A68B6E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Orders Line Chart */}
        <div className="bg-white rounded-lg p-5 border">
          <h3 className="font-semibold mb-4">Monthly Orders & Returns</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#1C1C1C" strokeWidth={2} dot={false} name="Orders" />
              <Line type="monotone" dataKey="returns" stroke="#ef4444" strokeWidth={2} dot={false} name="Returns" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Color Pie Chart */}
        {colorData.length > 0 && (
          <div className="bg-white rounded-lg p-5 border">
            <h3 className="font-semibold mb-4">Sales by Color</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={colorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                  {colorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Step 3: Create dashboard page**

```typescript
// store/src/app/admin/page.tsx
import { supabaseAdmin } from '@/lib/supabase/server'
import { ShoppingBag, TrendingUp, Package, Clock } from 'lucide-react'
import DashboardCharts from '@/components/admin/DashboardCharts'
import type { Order } from '@/types'

export default async function AdminDashboard() {
  const { data: orders } = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false })
  const allOrders = (orders || []) as Order[]

  const today = new Date().toDateString()
  const todayOrders = allOrders.filter(o => new Date(o.created_at).toDateString() === today)
  const thisMonth = new Date().getMonth()
  const monthOrders = allOrders.filter(o => new Date(o.created_at).getMonth() === thisMonth)
  const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0)
  const pendingOrders = allOrders.filter(o => o.order_status === 'new' || o.order_status === 'processing')

  const stats = [
    { label: "Today's Orders", value: todayOrders.length, icon: ShoppingBag },
    { label: 'This Month Revenue', value: `PKR ${monthRevenue.toLocaleString()}`, icon: TrendingUp },
    { label: 'Total Orders', value: allOrders.length, icon: Package },
    { label: 'Pending Shipments', value: pendingOrders.length, icon: Clock },
  ]

  return (
    <div>
      <h1 className="text-2xl font-['Playfair_Display'] mb-8">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg p-5 border">
            <s.icon size={20} className="text-[#A68B6E] mb-2" />
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <DashboardCharts orders={allOrders} />
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add store/src/app/admin/ store/src/components/admin/
git commit -m "feat: add admin dashboard with revenue, orders, returns, and color charts"
```

---

### Task 20: Admin Products Management

**Files:**
- Create: `store/src/app/admin/products/page.tsx`
- Create: `store/src/app/admin/products/new/page.tsx`
- Create: `store/src/app/api/admin/products/route.ts`

**Step 1: Create products API**

```typescript
// store/src/app/api/admin/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const { data, error } = await supabaseAdmin.from('products').insert([{ ...body, slug }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { id, ...body } = await req.json()
  const { error } = await supabaseAdmin.from('products').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('products').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 2: Create products list page**

```typescript
// store/src/app/admin/products/page.tsx
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'

export default async function AdminProducts() {
  const { data } = await supabaseAdmin.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false })
  const products = (data || []) as Product[]

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-['Playfair_Display']">Products</h1>
        <Button asChild className="bg-[#1C1C1C] text-white rounded-none">
          <Link href="/admin/products/new"><Plus size={16} className="mr-1" />Add Product</Link>
        </Button>
      </div>
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b"><tr>
            <th className="text-left p-4">Name</th>
            <th className="text-left p-4">Price</th>
            <th className="text-left p-4">Stock</th>
            <th className="text-left p-4">Actions</th>
          </tr></thead>
          <tbody>{products.map(p => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="p-4 font-medium">{p.name}</td>
              <td className="p-4">PKR {p.price.toLocaleString()}</td>
              <td className="p-4">{p.stock_quantity}</td>
              <td className="p-4">
                <Link href={`/admin/products/${p.id}`} className="text-[#A68B6E] hover:underline">Edit</Link>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}
```

**Step 3: Create new product form page**

```typescript
// store/src/app/admin/products/new/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function NewProduct() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', stock_quantity: '', images: '', colors: '', sizes: [] as string[] })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const toggleSize = (s: string) => set('sizes', form.sizes.includes(s) ? form.sizes.filter(x => x !== s) : [...form.sizes, s])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        images: form.images.split('\n').map(s => s.trim()).filter(Boolean),
        colors: form.colors.split(',').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes,
      }),
    })
    router.push('/admin/products')
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-['Playfair_Display'] mb-6">Add Product</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-6 rounded-lg border">
        <div><Label>Product Name *</Label><Input required value={form.name} onChange={e => set('name', e.target.value)} /></div>
        <div><Label>Description</Label><textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={form.description} onChange={e => set('description', e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Price (PKR) *</Label><Input required type="number" value={form.price} onChange={e => set('price', e.target.value)} /></div>
          <div><Label>Stock Quantity *</Label><Input required type="number" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} /></div>
        </div>
        <div><Label>Image URLs (one per line)</Label><textarea className="w-full border rounded px-3 py-2 text-sm" rows={3} value={form.images} onChange={e => set('images', e.target.value)} /></div>
        <div><Label>Colors (comma separated)</Label><Input value={form.colors} onChange={e => set('colors', e.target.value)} placeholder="Black, White, Navy Blue" /></div>
        <div>
          <Label className="block mb-2">Sizes</Label>
          <div className="flex gap-2 flex-wrap">{SIZES.map(s => (
            <button type="button" key={s} onClick={() => toggleSize(s)} className={`px-3 py-1 text-sm border rounded ${form.sizes.includes(s) ? 'bg-[#1C1C1C] text-white' : 'border-gray-300'}`}>{s}</button>
          ))}</div>
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-[#1C1C1C] text-white rounded-none">
          {loading ? 'Saving...' : 'Save Product'}
        </Button>
      </form>
    </div>
  )
}
```

**Step 4: Commit**

```bash
git add store/src/app/admin/products/ store/src/app/api/admin/products/
git commit -m "feat: add admin products management (list, add, delete)"
```

---

### Task 21: Admin Orders Management

**Files:**
- Create: `store/src/app/admin/orders/page.tsx`
- Create: `store/src/app/api/admin/orders/route.ts`

**Step 1: Create orders update API**

```typescript
// store/src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(req: NextRequest) {
  const { id, order_status } = await req.json()
  const { error } = await supabaseAdmin.from('orders').update({ order_status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

**Step 2: Create orders page**

```typescript
// store/src/app/admin/orders/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import type { Order } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-green-100 text-green-700',
  returned: 'bg-red-100 text-red-700',
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('orders').select('*').order('created_at', { ascending: false })
      .then(({ data }) => setOrders((data || []) as Order[]))
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, order_status: status }) })
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: status as any } : o))
  }

  return (
    <div>
      <h1 className="text-2xl font-['Playfair_Display'] mb-6">Orders</h1>
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
              <div>
                <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()} — {order.customer_name}</p>
                <p className="text-sm text-gray-500">{order.customer_phone} · {order.city} · {new Date(order.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-sm">PKR {order.total.toLocaleString()}</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.order_status]}`}>{order.order_status}</span>
              </div>
            </div>
            {expanded === order.id && (
              <div className="border-t p-4 bg-gray-50">
                <p className="text-sm font-medium mb-2">Items:</p>
                {order.items.map((item: any, i: number) => (
                  <p key={i} className="text-sm text-gray-600">{item.product_name} × {item.quantity} ({item.size}, {item.color}) — PKR {item.price.toLocaleString()}</p>
                ))}
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Update Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map(s => (
                      <button key={s} onClick={() => updateStatus(order.id, s)}
                        className={`text-xs px-3 py-1 rounded-full border ${order.order_status === s ? 'bg-[#1C1C1C] text-white border-[#1C1C1C]' : 'border-gray-300 hover:border-[#A68B6E]'}`}>
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

**Step 3: Commit**

```bash
git add store/src/app/admin/orders/ store/src/app/api/admin/orders/
git commit -m "feat: add admin orders management with status updates"
```

---

## Phase 7: Final Polish & Deployment

### Task 22: 404 Page & Loading States

**Files:**
- Create: `store/src/app/not-found.tsx`
- Create: `store/src/app/(store)/shop/loading.tsx`

**Step 1: Create 404 page**

```typescript
// store/src/app/not-found.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center text-center px-4">
      <div>
        <h1 className="text-6xl font-['Playfair_Display'] font-bold text-[#A68B6E] mb-4">404</h1>
        <p className="text-xl mb-2">Page not found</p>
        <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
        <Button asChild className="bg-[#1C1C1C] text-white rounded-none uppercase tracking-widest">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}
```

**Step 2: Create loading skeleton**

```typescript
// store/src/app/(store)/shop/loading.tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function ShopLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <Skeleton className="h-9 w-48 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-[3/4] rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Step 3: Commit**

```bash
git add store/src/app/not-found.tsx store/src/app/\(store\)/shop/loading.tsx
git commit -m "feat: add 404 page and loading skeletons"
```

---

### Task 23: Deploy to Vercel

**Step 1: Create vercel.json**

```json
// store/vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

**Step 2: Push to GitHub**

```bash
cd /c/Users/QC/Desktop/ecom-business-project
git add store/
git commit -m "feat: complete ZADIIS store initial build"
```

**Step 3: Deploy on Vercel**

1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Set root directory to `store`
4. Add all environment variables from `.env.local`
5. Deploy

**Step 4: Update NEXT_PUBLIC_APP_URL**

In Vercel dashboard, update `NEXT_PUBLIC_APP_URL` to your live URL (e.g. `https://zadiis.vercel.app`)

**Step 5: Verify live deployment**

- Visit homepage → products load
- Add to cart → cart count updates
- Place test order → email arrives

---

## Execution Options

Plan saved to `docs/plans/2026-06-08-zadiis-store-implementation.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** — Open a new Claude Code session with this plan, batch execution with checkpoints

**Which approach?**
