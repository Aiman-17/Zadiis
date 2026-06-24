'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Product } from '@/types'

export default function NewSalePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [discountPct, setDiscountPct] = useState('20')
  const [form, setForm] = useState({
    title: '', description: '', is_active: false,
    delivery_charge_override: '', starts_at: '', ends_at: '',
  })
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    fetch('/api/admin/products').then(r => r.json()).then(setProducts)
  }, [])

  const applyDiscountToAll = () => {
    const pct = Number(discountPct)
    if (!pct || pct <= 0 || pct >= 100) return
    setSelected(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(productId => {
        const p = products.find(pr => pr.id === productId)
        if (p) next[productId] = String(Math.floor(p.price * (1 - pct / 100)))
      })
      return next
    })
  }

  const toggleProduct = (id: string, price: number) => {
    setSelected(prev => {
      if (prev[id] !== undefined) {
        const next = { ...prev }
        delete next[id]
        return next
      }
      const pct = Number(discountPct) || 20
      return { ...prev, [id]: String(Math.floor(price * (1 - pct / 100))) }
    })
  }

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

    const saleId = data.id
    const productEntries = Object.entries(selected).filter(([, price]) => price && Number(price) > 0)
    await Promise.all(productEntries.map(([product_id, sale_price]) =>
      fetch(`/api/admin/sales/${saleId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id, sale_price: Number(sale_price) }),
      })
    ))

    router.push(`/admin/sales/${saleId}/edit`)
  }

  const selectedCount = Object.keys(selected).length

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale</h1>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic details */}
        <div className="space-y-4 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#A68B6E' }}>Sale Details</h2>
          <div>
            <Label htmlFor="title">Sale Title *</Label>
            <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Eid Sale 2026" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <textarea id="desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" style={{ borderColor: '#E2E8F0' }}
              placeholder="Up to 40% off on selected items" />
          </div>
          <div>
            <Label htmlFor="delivery">Delivery Charge Override (PKR, optional)</Label>
            <Input id="delivery" type="number" min="0" value={form.delivery_charge_override}
              onChange={e => set('delivery_charge_override', e.target.value)}
              placeholder="Leave blank to keep zone pricing" className="mt-1" />
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
        </div>

        {/* Product selection */}
        <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide" style={{ color: '#A68B6E' }}>Select Products</h2>
            {selectedCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#E8DDD4', color: '#A68B6E' }}>
                {selectedCount} selected
              </span>
            )}
          </div>

          {/* Quick Discount % */}
          <div className="flex items-center gap-2 mb-3 p-3 rounded-lg" style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8DDD4' }}>
            <label className="text-xs font-medium shrink-0" style={{ color: '#1C1C1C' }}>Discount %</label>
            <input
              type="number"
              min="1"
              max="99"
              value={discountPct}
              onChange={e => setDiscountPct(e.target.value)}
              className="w-16 border rounded px-2 py-1 text-sm text-center"
              style={{ borderColor: '#A68B6E' }}
            />
            <span className="text-xs" style={{ color: '#9CA3AF' }}>off original price</span>
            <button
              type="button"
              onClick={applyDiscountToAll}
              disabled={selectedCount === 0}
              className="ml-auto text-xs px-3 py-1.5 rounded text-white transition-opacity disabled:opacity-40"
              style={{ backgroundColor: '#A68B6E' }}
            >
              Apply to All
            </button>
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
            {products.length === 0 && (
              <p className="text-sm py-4 text-center" style={{ color: '#9CA3AF' }}>Loading products…</p>
            )}
            {products.map(p => {
              const isSelected = selected[p.id] !== undefined
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 py-2.5 px-3 rounded border cursor-pointer transition-colors"
                  style={isSelected ? { borderColor: '#A68B6E', backgroundColor: '#FAF8F5' } : { borderColor: '#F3F4F6' }}
                  onClick={() => toggleProduct(p.id, p.price)}
                >
                  <input type="checkbox" readOnly checked={isSelected} className="w-4 h-4 shrink-0 accent-[#A68B6E]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>PKR {p.price.toLocaleString()}</p>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <span className="text-xs" style={{ color: '#6B7280' }}>Sale PKR</span>
                      <input
                        type="number"
                        value={selected[p.id]}
                        onChange={e => setSelected(prev => ({ ...prev, [p.id]: e.target.value }))}
                        className="w-24 border rounded px-2 py-1 text-xs"
                        style={{ borderColor: '#A68B6E' }}
                        min="0"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {selectedCount === 0 && products.length > 0 && (
            <p className="text-xs mt-3" style={{ color: '#9CA3AF' }}>
              Tap a product to add it. Sale price auto-fills at {discountPct || 20}% off.
            </p>
          )}
        </div>

        {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => router.push('/admin/sales')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1 text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
            {loading ? 'Creating…' : `Create Sale${selectedCount > 0 ? ` (${selectedCount} products)` : ''}`}
          </Button>
        </div>
      </form>
    </div>
  )
}
