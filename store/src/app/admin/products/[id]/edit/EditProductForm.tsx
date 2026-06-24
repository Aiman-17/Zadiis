'use client'
import { useState, useMemo } from 'react'
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
    cost_price: product.cost_price ? String(product.cost_price) : '',
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

  const gridSizes = useMemo(() => form.sizes.filter(s => s !== 'Unstitched'), [form.sizes])

  // For EDIT: only activate auto-calc when the product already has saved variant_stock
  // data. Legacy products with colors/sizes but empty variant_stock stay in manual mode
  // to prevent accidentally zeroing out the existing stock_quantity on save.
  const hasVariantTracking = Object.keys(form.variant_stock ?? {}).length > 0

  // Sum over ALL currently-visible grid cells (unfilled cells default to 0)
  const autoStock = useMemo(() => {
    if (!hasVariantTracking) return null
    const cols = parsedColors.length > 0 ? parsedColors : ['_']
    const szs = gridSizes.length > 0 ? gridSizes : ['_']
    let total = 0
    for (const c of cols) {
      for (const s of szs) {
        total += form.variant_stock?.[c]?.[s] ?? 0
      }
    }
    return total
  }, [hasVariantTracking, parsedColors, gridSizes, form.variant_stock])

  // Build complete Color×Size matrix so every cell is persisted (including 0s),
  // allowing the product page to correctly disable out-of-stock variants.
  const buildCompleteVariantStock = (): VariantStock => {
    if (!hasVariantTracking) return {}
    const cols = parsedColors.length > 0 ? parsedColors : ['_']
    const szs = gridSizes.length > 0 ? gridSizes : ['_']
    const result: VariantStock = {}
    for (const c of cols) {
      result[c] = {}
      for (const s of szs) {
        result[c][s] = form.variant_stock?.[c]?.[s] ?? 0
      }
    }
    return result
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const completeVariantStock = buildCompleteVariantStock()
    const res = await fetch('/api/admin/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: product.id,
        name: form.name,
        sku: form.sku || null,
        description: form.description,
        price: Number(form.price),
        cost_price: form.cost_price ? Number(form.cost_price) : 0,
        stock_quantity: autoStock !== null ? autoStock : Number(form.stock_quantity),
        images: form.images,
        colors: parsedColors,
        sizes: form.sizes,
        category_id: form.category_id || null,
        is_active: form.is_active,
        is_bestseller: form.is_bestseller,
        variant_stock: completeVariantStock,
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
            <Label htmlFor="cost_price">Cost Price (PKR)</Label>
            <Input id="cost_price" type="number" min="0" value={form.cost_price} onChange={e => set('cost_price', e.target.value)} placeholder="What you paid" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="stock">
              Total Stock {hasVariantTracking ? <span className="font-normal text-gray-400">(auto-calculated from grid)</span> : null}
            </Label>
            {hasVariantTracking ? (
              <div
                id="stock"
                className="mt-1 px-3 py-2 border rounded text-sm bg-gray-50"
                style={{ borderColor: '#E2E8F0', color: '#374151' }}
              >
                {autoStock}
              </div>
            ) : (
              <>
                <Input id="stock" required type="number" min="0" value={form.stock_quantity} onChange={e => set('stock_quantity', e.target.value)} className="mt-1" />
                <p className="text-xs mt-1" style={{ color: '#A68B6E' }}>Fill in the variant grid below to enable auto-calculation</p>
              </>
            )}
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
