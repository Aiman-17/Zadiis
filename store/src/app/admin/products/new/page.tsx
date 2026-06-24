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

function sumVariantStock(vs: VariantStock): number {
  return Object.values(vs).reduce(
    (sum, sizeMap) => sum + Object.values(sizeMap).reduce((s, qty) => s + (qty || 0), 0),
    0
  )
}

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
    is_bestseller: false,
    variant_stock: {} as VariantStock,
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

  const hasVariantTracking = useMemo(
    () => Object.keys(form.variant_stock ?? {}).length > 0,
    [form.variant_stock]
  )
  const autoStock = useMemo(
    () => hasVariantTracking ? sumVariantStock(form.variant_stock) : null,
    [hasVariantTracking, form.variant_stock]
  )

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
        stock_quantity: autoStock !== null ? autoStock : Number(form.stock_quantity),
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
        <Button type="submit" disabled={loading} className="w-full text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          {loading ? 'Saving...' : 'Save Product'}
        </Button>
      </form>
    </div>
  )
}
