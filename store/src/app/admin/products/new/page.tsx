'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUploader from '@/components/admin/ImageUploader'
import VariantStockGrid from '@/components/admin/VariantStockGrid'
import type { VariantStock } from '@/types'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unstitched']
const PRESET_CATEGORIES = ['Summer', 'Winter', 'Formal', 'Casual', 'Eid', 'Sale']

const FLAG_OPTIONS = [
  { key: 'is_bestseller',  label: '★ Best Seller', activeBg: '#FFFBEB', activeColor: '#92400E' },
  { key: 'is_trending',    label: '↑ Trending',    activeBg: '#FDF2F8', activeColor: '#9D174D' },
  { key: 'is_new_arrival', label: '✦ New Arrival', activeBg: '#F5F3FF', activeColor: '#5B21B6' },
] as const

export default function NewProduct() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [isOtherCategory, setIsOtherCategory] = useState(false)
  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    price: '',
    cost_price: '',
    stock_quantity: '',
    images: [] as string[],
    colors: '',
    sizes: [] as string[],
    category_id: '',
    product_category: '',
    is_active: true,
    is_bestseller: false,
    is_trending: false,
    is_new_arrival: false,
    collection_name: '',
    new_arrival_start: '',
    new_arrival_end: '',
    no_restock: false,
    variant_stock: {} as VariantStock,
  })

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(r => r.json())
      .then((data: { id: string; name: string }[]) => {
        setCategories(data)
      })
      .catch(() => {})
  }, [])

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
  const hasVariantTracking = parsedColors.length > 0 || gridSizes.length > 0

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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
        product_category: form.product_category || null,
        is_active: form.is_active,
        is_bestseller: form.is_bestseller,
        is_trending: form.is_trending,
        is_new_arrival: form.is_new_arrival,
        collection_name: form.collection_name || null,
        new_arrival_start: form.new_arrival_start || null,
        new_arrival_end: form.new_arrival_end || null,
        no_restock: form.no_restock,
        variant_stock: completeVariantStock,
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
            <Label htmlFor="category">Collection (FK)</Label>
            <select
              id="category"
              value={form.category_id}
              onChange={e => set('category_id', e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mt-1"
              style={{ borderColor: '#E2E8F0' }}
            >
              <option value="">No collection (optional)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <Label className="block mb-2">Season / Type</Label>
          <select
            value={isOtherCategory ? 'Other' : (form.product_category || '')}
            onChange={e => {
              const v = e.target.value
              if (v === 'Other') { setIsOtherCategory(true); set('product_category', '') }
              else { setIsOtherCategory(false); set('product_category', v) }
            }}
            className="w-full border rounded px-3 py-2 text-sm"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="">— Select season / type —</option>
            {PRESET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="Other">Other (type below)</option>
          </select>
          {isOtherCategory && (
            <Input
              className="mt-2"
              placeholder="e.g. Party Wear, Bridal"
              value={form.product_category}
              onChange={e => set('product_category', e.target.value)}
              style={{ borderColor: '#E2E8F0' }}
            />
          )}
        </div>
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

        <div>
          <Label className="block mb-2">Product Flags</Label>
          <div className="flex gap-2 flex-wrap">
            {FLAG_OPTIONS.map(flag => (
              <button
                type="button"
                key={flag.key}
                onClick={() => set(flag.key, !form[flag.key])}
                className="px-3 py-1.5 text-xs border rounded-full font-medium transition-all"
                style={form[flag.key]
                  ? { backgroundColor: flag.activeBg, color: flag.activeColor, borderColor: flag.activeColor }
                  : { borderColor: '#E2E8F0', color: '#9CA3AF', backgroundColor: 'white' }}
              >
                {flag.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: '#9CA3AF' }}>Auto-scoring also runs in the background — these are manual overrides</p>

          {/* New Arrival detail fields */}
          {form.is_new_arrival && (
            <div className="mt-3 p-4 rounded-lg border-l-4 space-y-3" style={{ borderLeftColor: '#5B21B6', backgroundColor: '#FAF5FF' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#5B21B6' }}>New Arrival Settings</p>
              <div>
                <Label className="text-xs">Collection Name</Label>
                <Input
                  className="mt-1 text-sm"
                  placeholder="e.g. Eid Collection 2026"
                  value={form.collection_name}
                  onChange={e => set('collection_name', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Launch Date</Label>
                  <Input type="date" className="mt-1 text-sm" value={form.new_arrival_start} onChange={e => set('new_arrival_start', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Expiry Date</Label>
                  <Input type="date" className="mt-1 text-sm" value={form.new_arrival_end} onChange={e => set('new_arrival_end', e.target.value)} />
                  <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Leave blank — stays active until manually retired</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="no_restock" checked={form.no_restock} onChange={e => set('no_restock', e.target.checked)} className="w-4 h-4" />
          <div>
            <Label htmlFor="no_restock">No restock planned</Label>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>Enables "Last Chance" badge when stock ≤ 3</p>
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
