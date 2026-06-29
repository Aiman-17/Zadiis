# Sprint 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add image upload, SKU, short order numbers, order confirmation redesign, and delivery charge management to the ZADIIS store.

**Architecture:** Features are layered — DB schema first, then API routes, then UI components. Each task is independently deployable. Delivery charge flows from `delivery_zones` table → checkout → order record. Order numbers are generated server-side at order creation.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (PostgreSQL + Storage), Tailwind CSS v4, inline styles for brand colors.

**Brand colors:** bg=`#FAF8F5`, text=`#1C1C1C`, accent=`#A68B6E`, border=`#E8DDD4`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `store/supabase/migrations/sprint1.sql` | Create | DB schema changes |
| `store/src/types/index.ts` | Modify | Add SKU, order_number, delivery_charge, DeliveryZone |
| `store/src/app/api/admin/upload/route.ts` | Create | Image upload to Supabase Storage |
| `store/src/components/admin/ImageUploader.tsx` | Create | Upload UI with compression + preview |
| `store/src/app/admin/products/new/page.tsx` | Modify | Add SKU + ImageUploader |
| `store/src/app/admin/products/[id]/edit/EditProductForm.tsx` | Modify | Add SKU + ImageUploader |
| `store/src/app/admin/products/page.tsx` | Modify | Add SKU column |
| `store/src/app/api/delivery-zones/route.ts` | Create | Public GET — active zones + COD setting |
| `store/src/app/api/admin/delivery-zones/route.ts` | Create | Admin CRUD for delivery zones |
| `store/src/app/api/admin/settings/route.ts` | Create | GET/POST store settings (COD toggle) |
| `store/src/app/api/admin/orders/route.ts` | Modify | Add GET endpoint |
| `store/src/app/admin/settings/page.tsx` | Create | Settings page UI |
| `store/src/app/admin/layout.tsx` | Modify | Add Settings nav link |
| `store/src/app/(store)/checkout/page.tsx` | Modify | Dynamic cities + delivery charge |
| `store/src/app/api/orders/route.ts` | Modify | Generate order_number, store delivery_charge |
| `store/src/app/(store)/order/[id]/page.tsx` | Modify | Full redesign — order card + WhatsApp |
| `store/src/app/admin/orders/page.tsx` | Modify | Show order_number, fetch via API |

---

## Task 1: Database Migration

**Files:**
- Create: `store/supabase/migrations/sprint1.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- store/supabase/migrations/sprint1.sql

-- Delivery zones (cities + charges, managed from admin settings)
create table if not exists delivery_zones (
  id uuid default gen_random_uuid() primary key,
  city text not null unique,
  delivery_charge decimal(10,2) not null default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Store settings (key/value: cod_enabled etc.)
create table if not exists store_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Add SKU to products
alter table products add column if not exists sku text unique;

-- Add order_number and delivery_charge to orders
alter table orders add column if not exists order_number text unique;
alter table orders add column if not exists delivery_charge decimal(10,2) not null default 0;

-- Seeds
insert into delivery_zones (city, delivery_charge)
  values ('Karachi', 200)
  on conflict (city) do nothing;

insert into store_settings (key, value)
  values ('cod_enabled', 'false')
  on conflict (key) do nothing;

-- RLS for new tables
alter table delivery_zones enable row level security;
alter table store_settings enable row level security;

create policy "delivery_zones_anon_select"
  on delivery_zones for select to anon using (is_active = true);
create policy "delivery_zones_service_all"
  on delivery_zones for all to service_role using (true);

create policy "store_settings_anon_select"
  on store_settings for select to anon using (true);
create policy "store_settings_service_all"
  on store_settings for all to service_role using (true);
```

- [ ] **Step 2: Run in Supabase SQL Editor**

Go to your Supabase project → SQL Editor → New query → paste the above → Run.

Expected output: `Success. No rows returned.`

- [ ] **Step 3: Create Supabase Storage bucket (manual)**

In Supabase dashboard → Storage → New bucket:
- Name: `product-images`
- Public: **ON** (toggle on)
- Click Create

- [ ] **Step 4: Verify**

In Supabase → Table Editor, confirm these tables exist: `delivery_zones`, `store_settings`.
Check `products` table has `sku` column. Check `orders` table has `order_number` and `delivery_charge` columns.

- [ ] **Step 5: Commit**

```bash
git add store/supabase/migrations/sprint1.sql
git commit -m "feat: sprint1 database migration"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `store/src/types/index.ts`

- [ ] **Step 1: Replace the file contents**

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
  created_at: string
}

export type DeliveryZone = {
  id: string
  city: string
  delivery_charge: number
  is_active: boolean
  created_at: string
}
```

- [ ] **Step 2: Commit**

```bash
git add store/src/types/index.ts
git commit -m "feat: add sku, order_number, delivery_charge, DeliveryZone types"
```

---

## Task 3: Image Upload API Route

**Files:**
- Create: `store/src/app/api/admin/upload/route.ts`

- [ ] **Step 1: Create the upload route**

```typescript
// store/src/app/api/admin/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.type === 'image/png' ? 'png' : 'jpg'
    const path = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data, error } = await supabaseAdmin.storage
      .from('product-images')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('Upload API error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Verify manually**

Start the dev server (`npm run dev` in `store/`). The route should be available at `http://localhost:3000/api/admin/upload`. No visual test needed yet — tested in Task 4.

- [ ] **Step 3: Commit**

```bash
git add store/src/app/api/admin/upload/route.ts
git commit -m "feat: image upload API route to Supabase Storage"
```

---

## Task 4: ImageUploader Component

**Files:**
- Create: `store/src/components/admin/ImageUploader.tsx`

- [ ] **Step 1: Create the component**

```typescript
// store/src/components/admin/ImageUploader.tsx
'use client'
import { useState, useRef } from 'react'
import Image from 'next/image'
import { X, Upload, AlertTriangle } from 'lucide-react'

type Props = {
  images: string[]
  onChange: (urls: string[]) => void
}

type Preview = {
  file: File
  objectUrl: string
  width: number
  height: number
  originalSize: number
  compressedSize?: number
  warning?: string
  uploading?: boolean
  uploaded?: boolean
  error?: string
}

async function compressImage(file: File): Promise<{ blob: Blob; width: number; height: number; originalSize: number; compressedSize: number; warning?: string }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const originalSize = file.size
      const warning = img.width < 800 ? 'Image too small — may look blurry on product page' : undefined
      const maxWidth = 1200
      const scale = img.width > maxWidth ? maxWidth / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        resolve({
          blob: blob!,
          width: canvas.width,
          height: canvas.height,
          originalSize,
          compressedSize: blob!.size,
          warning,
        })
      }, 'image/jpeg', 0.8)
    }
    img.src = objectUrl
  })
}

export default function ImageUploader({ images, onChange }: Props) {
  const [previews, setPreviews] = useState<Preview[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList) => {
    const newPreviews: Preview[] = []
    for (const file of Array.from(files)) {
      const objectUrl = URL.createObjectURL(file)
      const img = new window.Image()
      await new Promise<void>(res => { img.onload = () => res(); img.src = objectUrl })
      newPreviews.push({
        file,
        objectUrl,
        width: img.width,
        height: img.height,
        originalSize: file.size,
      })
    }
    setPreviews(prev => [...prev, ...newPreviews])
  }

  const uploadPreview = async (index: number) => {
    const preview = previews[index]
    setPreviews(prev => prev.map((p, i) => i === index ? { ...p, uploading: true } : p))
    try {
      const { blob, width, height, compressedSize, warning } = await compressImage(preview.file)
      const formData = new FormData()
      formData.append('file', new File([blob], 'image.jpg', { type: 'image/jpeg' }))
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, uploading: false, uploaded: true, width, height, compressedSize, warning } : p
      ))
      onChange([...images, url])
    } catch {
      setPreviews(prev => prev.map((p, i) =>
        i === index ? { ...p, uploading: false, error: 'Upload failed. Try again.' } : p
      ))
    }
  }

  const removeUploaded = (url: string) => onChange(images.filter(u => u !== url))

  const removePreview = (index: number) => {
    URL.revokeObjectURL(previews[index].objectUrl)
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const formatSize = (bytes: number) => bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)}KB`
    : `${(bytes / 1024 / 1024).toFixed(1)}MB`

  return (
    <div className="space-y-3">
      {/* Already uploaded images */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative aspect-[3/4] rounded overflow-hidden bg-gray-100 group">
              <Image src={url} alt={`Product image ${i + 1}`} fill className="object-cover" />
              <button
                type="button"
                onClick={() => removeUploaded(url)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Pending previews */}
      {previews.filter(p => !p.uploaded).map((preview, index) => (
        <div key={index} className="flex gap-3 border rounded p-3 items-start" style={{ borderColor: '#E8DDD4' }}>
          <div className="w-16 h-20 relative rounded overflow-hidden bg-gray-100 shrink-0">
            <Image src={preview.objectUrl} alt="Preview" fill className="object-cover" />
          </div>
          <div className="flex-1 text-xs text-gray-600 space-y-1">
            <p>{preview.width}×{preview.height}px · {formatSize(preview.originalSize)}</p>
            {preview.compressedSize && (
              <p className="text-green-600">After compression: {formatSize(preview.compressedSize)}</p>
            )}
            {preview.warning && (
              <p className="flex items-center gap-1" style={{ color: '#B45309' }}>
                <AlertTriangle size={11} />{preview.warning}
              </p>
            )}
            {preview.error && <p className="text-red-500">{preview.error}</p>}
          </div>
          <div className="flex gap-2 shrink-0">
            {!preview.uploading && !preview.uploaded && (
              <button
                type="button"
                onClick={() => uploadPreview(index)}
                className="text-xs px-3 py-1 text-white rounded"
                style={{ backgroundColor: '#1C1C1C' }}
              >
                Upload
              </button>
            )}
            {preview.uploading && (
              <span className="text-xs text-gray-400 py-1">Uploading...</span>
            )}
            <button
              type="button"
              onClick={() => removePreview(index)}
              className="text-gray-400 hover:text-red-500"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ))}

      {/* Upload button */}
      {images.length < 8 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 border-2 border-dashed rounded px-4 py-3 text-sm w-full justify-center hover:bg-gray-50 transition-colors"
          style={{ borderColor: '#E8DDD4', color: '#A68B6E' }}
        >
          <Upload size={16} />
          Upload Images (max 8)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add store/src/components/admin/ImageUploader.tsx
git commit -m "feat: ImageUploader component with compression and preview"
```

---

## Task 5: Add SKU + ImageUploader to Product Forms

**Files:**
- Modify: `store/src/app/admin/products/new/page.tsx`
- Modify: `store/src/app/admin/products/[id]/edit/EditProductForm.tsx`
- Modify: `store/src/app/admin/products/page.tsx`

- [ ] **Step 1: Update new product page**

Replace `store/src/app/admin/products/new/page.tsx` with:

```typescript
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUploader from '@/components/admin/ImageUploader'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

export default function NewProduct() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
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
  })

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then((data: { id: string; name: string }[]) => {
        setCategories(data)
        if (data[0]) setForm(f => ({ ...f, category_id: data[0].id }))
      })
      .catch(() => {})
  }, [])

  const set = (k: string, v: string | boolean | string[]) => setForm(f => ({ ...f, [k]: v }))

  const toggleSize = (s: string) =>
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter(x => x !== s) : [...f.sizes, s],
    }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        sku: form.sku || null,
        description: form.description,
        price: Number(form.price),
        stock_quantity: Number(form.stock_quantity),
        images: form.images,
        colors: form.colors.split(',').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes,
        category_id: form.category_id || null,
        is_active: form.is_active,
      }),
    })
    if (res.ok) {
      router.push('/admin/products')
    } else {
      alert('Failed to save product. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Add Product</h1>
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
            <Label htmlFor="stock">Stock Quantity *</Label>
            <Input id="stock" required type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="mt-1" />
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
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(s => (
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
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4" />
          <Label htmlFor="is_active">Active (visible in store)</Label>
        </div>
        <Button type="submit" disabled={loading} className="w-full text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          {loading ? 'Saving...' : 'Save Product'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Update edit product form**

Replace `store/src/app/admin/products/[id]/edit/EditProductForm.tsx` with:

```typescript
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUploader from '@/components/admin/ImageUploader'
import type { Product, Category } from '@/types'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

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
  })

  const set = (k: string, v: string | boolean | string[]) => setForm(f => ({ ...f, [k]: v }))

  const toggleSize = (s: string) =>
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter(x => x !== s) : [...f.sizes, s],
    }))

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
        colors: form.colors.split(',').map(s => s.trim()).filter(Boolean),
        sizes: form.sizes,
        category_id: form.category_id || null,
        is_active: form.is_active,
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
            <Label htmlFor="stock">Stock Quantity *</Label>
            <Input id="stock" required type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="mt-1" />
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
          <div className="flex gap-2 flex-wrap">
            {SIZES.map(s => (
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
          </div>
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

- [ ] **Step 3: Add SKU column to admin products list**

In `store/src/app/admin/products/page.tsx`, update the table header and rows:

```typescript
// Change the <thead> to:
<thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
  <tr>
    <th className="text-left p-4 font-medium">Name</th>
    <th className="text-left p-4 font-medium">SKU</th>
    <th className="text-left p-4 font-medium">Price</th>
    <th className="text-left p-4 font-medium">Stock</th>
    <th className="text-left p-4 font-medium">Status</th>
    <th className="text-left p-4 font-medium">Actions</th>
  </tr>
</thead>

// Change each <tr> in the tbody to:
<tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
  <td className="p-4 font-medium">{p.name}</td>
  <td className="p-4 text-sm text-gray-500">{p.sku || '—'}</td>
  <td className="p-4">PKR {p.price.toLocaleString()}</td>
  <td className="p-4">{p.stock_quantity}</td>
  <td className="p-4">
    <span className="text-xs px-2 py-0.5 rounded-full"
      style={p.is_active ? { backgroundColor: '#DCFCE7', color: '#166534' } : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
      {p.is_active ? 'Active' : 'Hidden'}
    </span>
  </td>
  <td className="p-4"><ProductActions id={p.id} /></td>
</tr>

// Also update the empty state colSpan from 4 to 6:
<td colSpan={6} className="p-8 text-center text-gray-400">
```

- [ ] **Step 4: Verify in browser**

Go to `http://localhost:3000/admin/products/new`. Confirm:
- SKU field visible next to product name
- "Upload Images" button visible
- Clicking it opens file picker
- Selecting an image shows preview with dimensions

- [ ] **Step 5: Commit**

```bash
git add store/src/app/admin/products/new/page.tsx store/src/app/admin/products/[id]/edit/EditProductForm.tsx store/src/app/admin/products/page.tsx
git commit -m "feat: add SKU field and ImageUploader to product forms"
```

---

## Task 6: Delivery Zones + Settings API Routes

**Files:**
- Create: `store/src/app/api/delivery-zones/route.ts`
- Create: `store/src/app/api/admin/delivery-zones/route.ts`
- Create: `store/src/app/api/admin/settings/route.ts`

- [ ] **Step 1: Public delivery zones endpoint (used by checkout)**

```typescript
// store/src/app/api/delivery-zones/route.ts
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const [{ data: zones }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('delivery_zones').select('id, city, delivery_charge').eq('is_active', true).order('city'),
      supabaseAdmin.from('store_settings').select('key, value'),
    ])
    const cod_enabled = settings?.find(s => s.key === 'cod_enabled')?.value === 'true'
    return NextResponse.json({ zones: zones || [], cod_enabled })
  } catch {
    return NextResponse.json({ zones: [], cod_enabled: false })
  }
}
```

- [ ] **Step 2: Admin delivery zones CRUD**

```typescript
// store/src/app/api/admin/delivery-zones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('delivery_zones')
    .select('*')
    .order('city')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const { city, delivery_charge } = await req.json()
  if (!city || delivery_charge === undefined) {
    return NextResponse.json({ error: 'city and delivery_charge required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('delivery_zones')
    .insert([{ city, delivery_charge: Number(delivery_charge) }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...body } = await req.json()
  const { error } = await supabaseAdmin.from('delivery_zones').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('delivery_zones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Admin settings route (COD toggle)**

```typescript
// store/src/app/api/admin/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data } = await supabaseAdmin.from('store_settings').select('key, value')
  const settings: Record<string, string> = {}
  ;(data || []).forEach(({ key, value }) => { settings[key] = value })
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add store/src/app/api/delivery-zones/route.ts store/src/app/api/admin/delivery-zones/route.ts store/src/app/api/admin/settings/route.ts
git commit -m "feat: delivery zones and settings API routes"
```

---

## Task 7: Admin Settings Page + Nav Link

**Files:**
- Create: `store/src/app/admin/settings/page.tsx`
- Modify: `store/src/app/admin/layout.tsx`

- [ ] **Step 1: Create the settings page**

```typescript
// store/src/app/admin/settings/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2 } from 'lucide-react'
import type { DeliveryZone } from '@/types'

export default function AdminSettings() {
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [codEnabled, setCodEnabled] = useState(false)
  const [newCity, setNewCity] = useState('')
  const [newCharge, setNewCharge] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/delivery-zones')
      .then(r => r.json())
      .then(setZones)
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then((s: Record<string, string>) => setCodEnabled(s.cod_enabled === 'true'))
  }, [])

  const addZone = async () => {
    if (!newCity.trim() || !newCharge) return
    setSaving(true)
    const res = await fetch('/api/admin/delivery-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ city: newCity.trim(), delivery_charge: Number(newCharge) }),
    })
    if (res.ok) {
      const zone = await res.json()
      setZones(z => [...z, zone])
      setNewCity('')
      setNewCharge('')
    }
    setSaving(false)
  }

  const updateZone = async (id: string, fields: Partial<DeliveryZone>) => {
    setZones(z => z.map(zone => zone.id === id ? { ...zone, ...fields } : zone))
    await fetch('/api/admin/delivery-zones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...fields }),
    })
  }

  const deleteZone = async (id: string) => {
    if (!confirm('Remove this city?')) return
    await fetch('/api/admin/delivery-zones', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setZones(z => z.filter(zone => zone.id !== id))
  }

  const toggleCod = async (enabled: boolean) => {
    setCodEnabled(enabled)
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'cod_enabled', value: String(enabled) }),
    })
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Settings</h1>

      {/* Delivery Zones */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Delivery Zones</h2>
        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="border-b" style={{ borderColor: '#E8DDD4' }}>
              <th className="text-left py-2 font-medium">City</th>
              <th className="text-left py-2 font-medium">Charge (PKR)</th>
              <th className="text-left py-2 font-medium">Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                <td className="py-2">{zone.city}</td>
                <td className="py-2">
                  <input
                    type="number"
                    className="border rounded px-2 py-1 text-sm w-24"
                    style={{ borderColor: '#E2E8F0' }}
                    value={zone.delivery_charge}
                    onChange={e => updateZone(zone.id, { delivery_charge: Number(e.target.value) })}
                    onBlur={e => updateZone(zone.id, { delivery_charge: Number(e.target.value) })}
                  />
                </td>
                <td className="py-2">
                  <input
                    type="checkbox"
                    checked={zone.is_active}
                    onChange={e => updateZone(zone.id, { is_active: e.target.checked })}
                    className="w-4 h-4"
                  />
                </td>
                <td className="py-2">
                  <button onClick={() => deleteZone(zone.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex gap-2 items-end">
          <div>
            <Label className="text-xs">City</Label>
            <Input value={newCity} onChange={e => setNewCity(e.target.value)} placeholder="Lahore" className="mt-1 w-32" />
          </div>
          <div>
            <Label className="text-xs">Charge (PKR)</Label>
            <Input type="number" value={newCharge} onChange={e => setNewCharge(e.target.value)} placeholder="250" className="mt-1 w-28" />
          </div>
          <Button onClick={addZone} disabled={saving} className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            Add City
          </Button>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-white rounded-lg border p-6" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Payment Settings</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cash on Delivery (COD)</p>
            <p className="text-xs text-gray-500 mt-0.5">When enabled, COD option appears in checkout</p>
          </div>
          <button
            onClick={() => toggleCod(!codEnabled)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ backgroundColor: codEnabled ? '#1C1C1C' : '#D1D5DB' }}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow"
              style={{ transform: codEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add Settings link to admin layout**

In `store/src/app/admin/layout.tsx`, update the `NAV` array:

```typescript
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut } from 'lucide-react'

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/admin/products', icon: Package, label: 'Products', exact: false },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false },
  { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false },
]
```

- [ ] **Step 3: Verify in browser**

Go to `http://localhost:3000/admin/settings`. Confirm:
- Karachi with PKR 200 delivery charge appears
- Can edit the charge and it saves
- COD toggle works (flip it on, check checkout shows COD, flip off, COD disappears)

- [ ] **Step 4: Commit**

```bash
git add store/src/app/admin/settings/page.tsx store/src/app/admin/layout.tsx
git commit -m "feat: admin settings page with delivery zones and COD toggle"
```

---

## Task 8: Checkout — Dynamic Cities + Delivery Charge

**Files:**
- Modify: `store/src/app/(store)/checkout/page.tsx`

- [ ] **Step 1: Replace checkout page**

```typescript
// store/src/app/(store)/checkout/page.tsx
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCart, clearCart } from '@/lib/cart-store'
import type { CartItem } from '@/lib/cart-store'
import type { DeliveryZone } from '@/types'

const BASE_PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'card', label: 'Credit / Debit Card' },
]

const COD_METHOD = { id: 'cod', label: 'Cash on Delivery' }

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<CartItem[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [codEnabled, setCodEnabled] = useState(false)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    payment: '',
  })

  useEffect(() => {
    const cart = getCart()
    if (cart.length === 0) { router.push('/cart'); return }
    setItems(cart)
    fetch('/api/delivery-zones')
      .then(r => r.json())
      .then(({ zones, cod_enabled }: { zones: DeliveryZone[]; cod_enabled: boolean }) => {
        setZones(zones)
        setCodEnabled(cod_enabled)
      })
  }, [router])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCityChange = (city: string) => {
    set('city', city)
    const zone = zones.find(z => z.city === city)
    setDeliveryCharge(zone?.delivery_charge ?? 0)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const total = subtotal + deliveryCharge
  const paymentMethods = codEnabled ? [...BASE_PAYMENT_METHODS, COD_METHOD] : BASE_PAYMENT_METHODS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.payment) { alert('Please select a payment method'); return }
    setLoading(true)
    const orderItems = items.map(i => ({
      product_id: i.id,
      product_name: i.name,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      price: i.price,
    }))
    try {
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
          subtotal,
          delivery_charge: deliveryCharge,
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
    } catch {
      alert('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" required value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="address">Delivery Address *</Label>
          <Input id="address" required value={form.address} onChange={e => set('address', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <select
            id="city"
            required
            value={form.city}
            onChange={e => handleCityChange(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="">Select city</option>
            {zones.map(z => <option key={z.id} value={z.city}>{z.city}</option>)}
          </select>
          {form.city && (
            <p className="text-sm mt-1" style={{ color: '#A68B6E' }}>
              Delivery charge: PKR {deliveryCharge.toLocaleString()}
            </p>
          )}
        </div>
        <div>
          <Label className="block mb-2">Payment Method *</Label>
          <div className="space-y-2">
            {paymentMethods.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-3 border rounded p-3 cursor-pointer transition-colors"
                style={{ borderColor: form.payment === m.id ? '#1C1C1C' : '#E2E8F0', backgroundColor: form.payment === m.id ? '#F9FAFB' : 'white' }}
              >
                <input type="radio" name="payment" value={m.id} checked={form.payment === m.id} onChange={() => set('payment', m.id)} />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <div className="space-y-1 mb-3">
            {items.map(item => (
              <div key={`${item.id}-${item.size}-${item.color}`} className="flex justify-between text-sm text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery</span>
              <span>{form.city ? `PKR ${deliveryCharge.toLocaleString()}` : '—'}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t" style={{ borderColor: '#E8DDD4' }}>
              <span>Total</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <Button type="submit" disabled={loading} className="w-full text-white rounded-none uppercase tracking-widest py-6" style={{ backgroundColor: '#1C1C1C' }}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Go to `http://localhost:3000/checkout` (add an item to cart first). Confirm:
- City dropdown shows only Karachi (from `delivery_zones` table)
- Selecting Karachi shows "Delivery charge: PKR 200"
- Order summary shows Subtotal + Delivery + Total
- COD not visible (toggle is off by default)
- Enable COD in admin settings → refresh checkout → COD appears

- [ ] **Step 3: Commit**

```bash
git add store/src/app/(store)/checkout/page.tsx
git commit -m "feat: checkout with dynamic delivery zones and charge"
```

---

## Task 9: Order Number Generation

**Files:**
- Modify: `store/src/app/api/orders/route.ts`

- [ ] **Step 1: Replace the orders API route**

```typescript
// store/src/app/api/orders/route.ts
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

    const order_number = await generateOrderNumber()

    const { data: order, error } = await supabaseAdmin
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

    if (error) {
      console.error('DB insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    try {
      await resend.emails.send({
        from: 'orders@zadiis.com',
        to: process.env.OWNER_EMAIL!,
        subject: `New Order ${order.order_number} — PKR ${Number(order.total).toLocaleString()}`,
        html: `
          <h2 style="color:#1C1C1C;font-family:Georgia,serif">New Order Received!</h2>
          <p><strong>Order:</strong> ${order.order_number}</p>
          <p><strong>Customer:</strong> ${order.customer_name}</p>
          <p><strong>Phone:</strong> ${order.customer_phone}</p>
          <p><strong>Email:</strong> ${order.customer_email ?? '—'}</p>
          <p><strong>Address:</strong> ${order.address}, ${order.city}</p>
          <p><strong>Payment:</strong> ${order.payment_method}</p>
          <h3>Items:</h3>
          <ul>
            ${(order.items as Array<{ product_name: string; sku?: string; size: string; color: string; quantity: number; price: number }>)
              .map(i => `<li>${i.product_name}${i.sku ? ` (${i.sku})` : ''} — ${i.size}, ${i.color} × ${i.quantity} — PKR ${Number(i.price).toLocaleString()}</li>`)
              .join('')}
          </ul>
          <p><strong>Subtotal:</strong> PKR ${Number(order.subtotal).toLocaleString()}</p>
          <p><strong>Delivery:</strong> PKR ${Number(order.delivery_charge).toLocaleString()}</p>
          <p style="font-size:1.1em"><strong>Total: PKR ${Number(order.total).toLocaleString()}</strong></p>
        `,
      })
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

- [ ] **Step 2: Commit**

```bash
git add store/src/app/api/orders/route.ts
git commit -m "feat: order number generation (ZD-XXXX) and delivery charge in orders"
```

---

## Task 10: Order Confirmation Page Redesign

**Files:**
- Modify: `store/src/app/(store)/order/[id]/page.tsx`

- [ ] **Step 1: Replace the order confirmation page**

```typescript
// store/src/app/(store)/order/[id]/page.tsx
import { supabaseAdmin } from '@/lib/supabase/server'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { OrderItem } from '@/types'

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Order not found.</p>
        <Link href="/" className="text-sm underline mt-4 block">Back to home</Link>
      </div>
    )
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const whatsappMessage = encodeURIComponent(`Hi! I just placed order ${order.order_number} on ZADIIS`)
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
  const isPaid = order.payment_status === 'paid'

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#22C55E' }} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Order Placed!</h1>
        <p className="text-gray-500 mt-1">Thank you, {order.customer_name}</p>
      </div>

      {/* Order Card — designed to be screenshottable */}
      <div className="bg-white rounded-lg border overflow-hidden mb-6" style={{ borderColor: '#E8DDD4' }}>
        {/* Card header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Order</p>
              <p className="font-bold text-lg" style={{ color: '#A68B6E' }}>{order.order_number}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Items</p>
          <div className="space-y-2">
            {(order.items as OrderItem[]).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>{item.product_name}</span>
                  {item.sku && <span className="text-gray-400 ml-1">({item.sku})</span>}
                  <span className="text-gray-500"> × {item.quantity}</span>
                  <p className="text-xs text-gray-400">{item.size} · {item.color}</p>
                </div>
                <span className="font-medium shrink-0 ml-4">PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-b space-y-1" style={{ borderColor: '#E8DDD4' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>PKR {Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery</span>
            <span>PKR {Number(order.delivery_charge).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1">
            <span>Total</span>
            <span>PKR {Number(order.total).toLocaleString()}</span>
          </div>
        </div>

        {/* Delivery + payment info */}
        <div className="px-5 py-4 text-sm text-gray-500 space-y-1">
          <p><span className="font-medium text-gray-700">Payment:</span> {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}</p>
          <p><span className="font-medium text-gray-700">Deliver to:</span> {order.address}, {order.city}</p>
          <p><span className="font-medium text-gray-700">Phone:</span> {order.customer_phone}</p>
        </div>
      </div>

      {/* Payment status message */}
      <div className="text-center mb-6">
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-700">✓ Payment confirmed. Your order is being processed.</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
            <p className="text-sm text-gray-600 mb-3">
              Screenshot this page and send it to our WhatsApp along with any questions about your order.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-white text-sm font-medium"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.139.564 4.145 1.546 5.879L0 24l6.335-1.524A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.032-1.386l-.361-.214-3.741.9.944-3.653-.235-.374A9.818 9.818 0 112 12c0-5.414 4.404-9.818 9.818-9.818 2.695 0 5.232 1.05 7.136 2.954A10.023 10.023 0 0121.818 12c0 5.414-4.404 9.818-9.818 9.818z"/>
              </svg>
              Contact on WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/shop" className="text-sm hover:underline" style={{ color: '#A68B6E' }}>
          ← Continue Shopping
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Place a test order (go to `/shop`, add to cart, checkout with Karachi). Check the confirmation page shows:
- Order number like `ZD-1001`
- Items with size/color
- Subtotal + delivery + total
- WhatsApp button opens with pre-filled message

- [ ] **Step 3: Commit**

```bash
git add store/src/app/(store)/order/[id]/page.tsx
git commit -m "feat: order confirmation page redesign with order card and WhatsApp"
```

---

## Task 11: Admin Orders List — Order Numbers + API Fix

**Files:**
- Modify: `store/src/app/api/admin/orders/route.ts`
- Modify: `store/src/app/admin/orders/page.tsx`

- [ ] **Step 1: Add GET to admin orders API**

Read the current file first, then add a GET handler at the top:

```typescript
// Add this before the existing PUT export in store/src/app/api/admin/orders/route.ts
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
```

Also make sure the file imports `supabaseAdmin` and `NextResponse` — check the existing file has these imports already. Add if missing:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
```

- [ ] **Step 2: Update admin orders page to use API and show order number**

Replace `store/src/app/admin/orders/page.tsx` with:

```typescript
'use client'
import { useState, useEffect } from 'react'
import type { Order, OrderItem } from '@/types'

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  new: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  processing: { backgroundColor: '#FEF9C3', color: '#92400E' },
  shipped: { backgroundColor: '#EDE9FE', color: '#6D28D9' },
  delivered: { backgroundColor: '#DCFCE7', color: '#15803D' },
  returned: { backgroundColor: '#FEE2E2', color: '#DC2626' },
}

const STATUSES = ['new', 'processing', 'shipped', 'delivered', 'returned']

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/orders')
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
  }, [])

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/admin/orders', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, order_status: status }),
    })
    setOrders(orders.map(o => o.id === id ? { ...o, order_status: status as Order['order_status'] } : o))
  }

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Orders</h1>
      {orders.length === 0 && <p className="text-gray-400 text-sm">No orders yet.</p>}
      <div className="space-y-3">
        {orders.map(order => (
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

- [ ] **Step 3: Verify in browser**

Go to `/admin/orders`. Confirm:
- Orders load (via API instead of direct Supabase client)
- Order numbers show as `ZD-1001` in accent color
- Expanding an order shows SKU if available
- Subtotal + delivery breakdown visible

- [ ] **Step 4: Commit**

```bash
git add store/src/app/api/admin/orders/route.ts store/src/app/admin/orders/page.tsx
git commit -m "feat: admin orders show order numbers and delivery charge, fix to use API"
```

---

## Self-Review Checklist

- [x] **Image upload** — Task 3 (API) + Task 4 (component) + Task 5 (integrated in forms)
- [x] **Image compression + preview** — Task 4 compressImage() with canvas, preview with dimensions/size
- [x] **Image blurry warning** — Task 4 shows warning if width < 800px
- [x] **SKU field** — Task 5 adds to both new + edit forms; Task 11 shows in order details
- [x] **Short order number** — Task 9 generates ZD-XXXX; Task 10 + 11 display it
- [x] **Order confirmation redesign** — Task 10 full redesign with order card + WhatsApp
- [x] **WhatsApp pre-filled message** — Task 10 includes order_number in URL
- [x] **payment_status condition** — Task 10 shows different message for paid vs pending
- [x] **Delivery zones table** — Task 1 creates it, seeded with Karachi PKR 200
- [x] **Admin settings page** — Task 7 with live edit of city charges
- [x] **COD toggle** — Task 7 toggle + Task 8 checkout reads it
- [x] **Dynamic checkout cities** — Task 8 fetches from delivery_zones
- [x] **Delivery charge in checkout** — Task 8 shows charge on city select, sends in order
- [x] **Delivery charge in order** — Task 9 stores it, Task 10 displays it, Task 11 shows it
- [x] **Admin orders fix** — Task 11 switches from broken browser-client to API fetch
- [x] **Settings nav link** — Task 7 Step 2 adds Settings to admin nav
