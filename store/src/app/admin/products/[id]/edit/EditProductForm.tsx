'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import ImageUploader from '@/components/admin/ImageUploader'
import VariantStockGrid from '@/components/admin/VariantStockGrid'
import type { Product, Category, VariantStock } from '@/types'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { getAdminStatusColors } from '@/lib/adminColors'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unstitched']
const PRESET_CATEGORIES = ['Summer', 'Winter', 'Formal', 'Casual', 'Eid', 'Sale']

export default function EditProductForm({ product, categories }: { product: Product; categories: Category[] }) {
  const router = useRouter()
  const isDark = useAdminDarkMode()
  const C = getAdminStatusColors(isDark)
  // Best Seller and Trending are computed automatically (specs/003-merchandising-badges-v2)
  // and are no longer manual toggles — Featured is the merchant promotion outlet instead.
  const FLAG_OPTIONS = [
    { key: 'is_new_arrival', label: '✦ New Arrival', activeBg: isDark ? `color-mix(in srgb, ${C.violetStrong} 25%, var(--admin-surface))` : '#F5F3FF', activeColor: C.violetStrong },
    { key: 'is_featured',    label: '☆ Featured',    activeBg: isDark ? `color-mix(in srgb, ${C.warning} 25%, var(--admin-surface))` : '#FFFBEB', activeColor: isDark ? C.warning : '#92400E' },
  ] as const
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const existingCat = product.product_category || ''
  const [isOtherCategory, setIsOtherCategory] = useState(
    existingCat !== '' && !PRESET_CATEGORIES.includes(existingCat)
  )
  const [form, setForm] = useState({
    name: product.name,
    sku: product.sku || '',
    description: product.description || '',
    price: String(product.price),
    cost_price: product.cost_price ? String(product.cost_price) : '',
    stock_quantity: String(product.stock_quantity),
    images: [...product.images],
    image_colors: [...(product.image_colors ?? [])] as (string | null)[],
    colors: product.colors.join(', '),
    sizes: [...product.sizes],
    category_id: product.category_id || '',
    product_category: existingCat,
    is_active: product.is_active,
    is_new_arrival: product.is_new_arrival ?? false,
    collection_name: product.collection_name || '',
    new_arrival_start: product.new_arrival_start || '',
    new_arrival_end: product.new_arrival_end || '',
    is_featured: product.is_featured ?? false,
    featured_start: product.featured_start || '',
    featured_end: product.featured_end || '',
    no_restock: product.no_restock ?? false,
    variant_stock: (product.variant_stock ?? {}) as VariantStock,
  })

  const set = (k: string, v: string | boolean | string[] | (string | null)[] | VariantStock) => setForm(f => ({ ...f, [k]: v }))

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
    setError('')
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
        image_colors: form.image_colors,
        colors: parsedColors,
        sizes: form.sizes,
        category_id: form.category_id || null,
        product_category: form.product_category || null,
        is_active: form.is_active,
        is_new_arrival: form.is_new_arrival,
        collection_name: form.collection_name || null,
        new_arrival_start: form.new_arrival_start || null,
        new_arrival_end: form.new_arrival_end || null,
        is_featured: form.is_featured,
        featured_start: form.featured_start || null,
        featured_end: form.featured_end || null,
        no_restock: form.no_restock,
        variant_stock: completeVariantStock,
      }),
    })
    if (res.ok) {
      router.push('/admin/products')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to update product. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Product</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-[var(--admin-surface)] p-6 rounded-lg border" style={{ borderColor: 'var(--admin-border)' }}>
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
            style={{ borderColor: 'var(--admin-input-border)' }}
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
              Total Stock {hasVariantTracking ? <span className="font-normal" style={{ color: 'var(--admin-subtle)' }}>(auto-calculated from grid)</span> : null}
            </Label>
            {hasVariantTracking ? (
              <div
                id="stock"
                className="mt-1 px-3 py-2 border rounded text-sm bg-[var(--admin-bg)]"
                style={{ borderColor: 'var(--admin-input-border)', color: 'var(--admin-text)' }}
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
              style={{ borderColor: 'var(--admin-input-border)', backgroundColor: 'var(--admin-surface)', color: 'var(--admin-text)' }}
            >
              <option value="">— No collection —</option>
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
            style={{ borderColor: 'var(--admin-input-border)', backgroundColor: 'var(--admin-surface)', color: 'var(--admin-text)' }}
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
              style={{ borderColor: 'var(--admin-input-border)' }}
            />
          )}
        </div>
        <div>
          <Label className="block mb-2">Product Images</Label>
          <ImageUploader
            images={form.images}
            onChange={urls => set('images', urls)}
            availableColors={parsedColors}
            imageColors={form.image_colors}
            onColorsChange={colors => set('image_colors', colors)}
          />
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
                style={form.sizes.includes(s) ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' } : { borderColor: 'var(--admin-input-border)' }}
              >
                {s}
              </button>
            ))}
            <span className="text-sm" style={{ color: 'var(--admin-border)' }}>|</span>
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
                  : { borderColor: 'var(--admin-input-border)', color: 'var(--admin-subtle)', backgroundColor: 'var(--admin-surface)' }}
              >
                {flag.label}
              </button>
            ))}
          </div>
          <p className="text-xs mt-1.5" style={{ color: 'var(--admin-subtle)' }}>Best Seller and Trending are computed automatically from sales — Featured is for manual promotion</p>

          {/* New Arrival detail fields */}
          {form.is_new_arrival && (
            <div className="mt-3 p-4 rounded-lg border-l-4 space-y-3" style={{ borderLeftColor: C.violetStrong, backgroundColor: isDark ? `color-mix(in srgb, ${C.violetStrong} 15%, var(--admin-surface))` : '#FAF5FF' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.violetStrong }}>New Arrival Settings</p>
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
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Leave blank — stays active until manually retired</p>
                </div>
              </div>
            </div>
          )}

          {/* Featured detail fields */}
          {form.is_featured && (
            <div className="mt-3 p-4 rounded-lg border-l-4 space-y-3" style={{ borderLeftColor: isDark ? C.warning : '#92400E', backgroundColor: isDark ? `color-mix(in srgb, ${C.warning} 15%, var(--admin-surface))` : '#FFFBEB' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#92400E' }}>Featured Settings</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" className="mt-1 text-sm" value={form.featured_start} onChange={e => set('featured_start', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" className="mt-1 text-sm" value={form.featured_end} onChange={e => set('featured_end', e.target.value)} />
                  <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Leave blank — stays featured until manually retired</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="no_restock" checked={form.no_restock} onChange={e => set('no_restock', e.target.checked)} className="w-4 h-4 accent-[#A68B6E]" />
          <div>
            <Label htmlFor="no_restock">No restock planned</Label>
            <p className="text-xs" style={{ color: 'var(--admin-subtle)' }}>Enables "Last Chance" badge when stock ≤ 3</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 accent-[#A68B6E]" />
          <Label htmlFor="is_active">Active (visible in store)</Label>
        </div>
        {error && (
          <div className="rounded-md px-4 py-3 text-sm" style={{ backgroundColor: isDark ? `color-mix(in srgb, ${C.criticalStrong} 20%, var(--admin-surface))` : '#FEF2F2', color: C.criticalStrong, border: `1px solid ${isDark ? `color-mix(in srgb, ${C.criticalStrong} 40%, var(--admin-border))` : '#FECACA'}` }}>
            {error}
          </div>
        )}
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
