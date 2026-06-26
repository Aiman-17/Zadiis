'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Sale, SaleProduct, Product } from '@/types'

function getStock(p: Product): number {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0)
    return Object.values(vs).reduce((sum, sizes) =>
      sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0)
  return p.stock_quantity
}

function isSlowMover(p: Product, avgST: number): boolean {
  const age = (Date.now() - new Date(p.created_at).getTime()) / 86400000
  if (age < 15) return false
  const s = getStock(p)
  if (s === 0 || avgST === 0) return false
  return (p.total_sold / (p.total_sold + s)) < avgST * 0.5
}

function pkr(n: number) { return `PKR ${Number(n).toLocaleString('en-US')}` }

export default function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sale, setSale] = useState<Sale | null>(null)
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [addProductId, setAddProductId] = useState('')
  const [addSalePrice, setAddSalePrice] = useState('')
  const [discountPct, setDiscountPct] = useState('20')
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', is_active: false,
    delivery_charge_override: '', starts_at: '', ends_at: '',
  })

  const load = useCallback(async () => {
    const [salesRes, productsRes] = await Promise.all([
      fetch('/api/admin/sales'),
      fetch('/api/admin/products'),
    ])
    const salesData = await salesRes.json()
    const found = (salesData as (Sale & { sale_products: SaleProduct[] })[]).find(s => s.id === id)
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
    setAllProducts(await productsRes.json() as Product[])
  }, [id])

  useEffect(() => { load() }, [load])

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch(`/api/admin/sales/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.title, description: form.description || null, is_active: form.is_active,
        delivery_charge_override: form.delivery_charge_override ? Number(form.delivery_charge_override) : null,
        starts_at: form.starts_at || null, ends_at: form.ends_at || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to update'); setLoading(false); return }
    setLoading(false)
    load()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this sale? This cannot be undone.')) return
    const res = await fetch(`/api/admin/sales/${id}`, { method: 'DELETE' })
    if (!res.ok) { setError((await res.json()).error || 'Failed to delete sale'); return }
    router.push('/admin/sales')
  }

  const handleAddProduct = async () => {
    if (!addProductId || !addSalePrice) return
    await fetch(`/api/admin/sales/${id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: addProductId, sale_price: Number(addSalePrice) }),
    })
    setAddProductId(''); setAddSalePrice(''); load()
  }

  const handleRemoveProduct = async (productId: string) => {
    const res = await fetch(`/api/admin/sales/${id}/products`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    })
    if (!res.ok) { setError((await res.json()).error || 'Failed to remove product'); return }
    load()
  }

  const applyDiscountToExisting = async () => {
    const pct = Number(discountPct)
    if (!pct || pct <= 0 || pct >= 100) return
    setApplyingDiscount(true)
    await Promise.all(saleProducts.map(sp => {
      const product = allProducts.find(p => p.id === sp.product_id)
      if (!product) return Promise.resolve()
      return fetch(`/api/admin/sales/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: sp.product_id, sale_price: Math.floor(product.price * (1 - pct / 100)) }),
      })
    }))
    setApplyingDiscount(false)
    load()
  }

  if (!sale) return <div className="p-4 text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>

  const addedIds = new Set(saleProducts.map(sp => sp.product_id))
  const eligible = allProducts.filter(p => !addedIds.has(p.id) && !p.is_new_arrival)
  const eligibleForAvg = allProducts.filter(p => {
    const age = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return age >= 15 && getStock(p) > 0
  })
  const avgST = eligibleForAvg.length > 0
    ? eligibleForAvg.reduce((sum, p) => { const s = getStock(p); return sum + p.total_sold / (p.total_sold + s) }, 0) / eligibleForAvg.length
    : 0
  const availableProducts = [...eligible].sort((a, b) => {
    const aS = isSlowMover(a, avgST), bS = isSlowMover(b, avgST)
    if (aS && !bS) return -1; if (!aS && bS) return 1
    return b.best_seller_score - a.best_seller_score
  })
  const newArrivalCount = allProducts.filter(p => !addedIds.has(p.id) && p.is_new_arrival).length

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Sale</h1>
        {sale.is_active && (
          <Link href={`/admin/sales/${id}/analytics`}
            className="text-sm px-4 py-2 rounded-none border font-medium hover:bg-gray-50"
            style={{ borderColor: '#A68B6E', color: '#A68B6E' }}>
            View Analytics →
          </Link>
        )}
      </div>

      {/* Sale settings */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div>
          <Label htmlFor="title">Sale Title *</Label>
          <Input id="title" required value={form.title} onChange={e => set('title', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="desc">Description</Label>
          <textarea id="desc" value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" style={{ borderColor: '#E2E8F0' }} />
        </div>
        <div>
          <Label htmlFor="delivery">Delivery Charge Override (PKR, optional)</Label>
          <Input id="delivery" type="number" min="0" value={form.delivery_charge_override}
            onChange={e => set('delivery_charge_override', e.target.value)}
            placeholder="Leave blank to keep zone pricing" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="starts">Starts At</Label>
            <Input id="starts" type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} className="mt-1" /></div>
          <div><Label htmlFor="ends">Ends At</Label>
            <Input id="ends" type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} className="mt-1" /></div>
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

        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8DDD4' }}>
          <label className="text-xs font-medium shrink-0" style={{ color: '#1C1C1C' }}>Discount %</label>
          <input type="number" min="1" max="99" value={discountPct} onChange={e => setDiscountPct(e.target.value)}
            className="w-16 border rounded px-2 py-1 text-sm text-center" style={{ borderColor: '#A68B6E' }} />
          <span className="text-xs" style={{ color: '#9CA3AF' }}>off original price</span>
          <Button type="button" onClick={applyDiscountToExisting}
            disabled={applyingDiscount || saleProducts.length === 0}
            className="ml-auto text-xs text-white rounded-none" style={{ backgroundColor: '#A68B6E' }}>
            {applyingDiscount ? 'Updating…' : 'Apply to All'}
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <select value={addProductId}
            onChange={e => {
              setAddProductId(e.target.value)
              const p = availableProducts.find(pr => pr.id === e.target.value)
              setAddSalePrice(p ? String(Math.floor(p.price * (1 - (Number(discountPct) || 20) / 100))) : '')
            }}
            className="flex-1 border rounded px-3 py-2 text-sm" style={{ borderColor: '#E2E8F0' }}>
            <option value="">
              {availableProducts.length > 0
                ? `Select product to add${newArrivalCount > 0 ? ` (${newArrivalCount} new arrival${newArrivalCount !== 1 ? 's' : ''} hidden)` : ''}…`
                : 'All eligible products added'}
            </option>
            {availableProducts.map(p => (
              <option key={p.id} value={p.id}>
                {isSlowMover(p, avgST) ? '⚠ ' : ''}{p.name} (PKR {p.price.toLocaleString()})
              </option>
            ))}
          </select>
          <Input type="number" placeholder="Sale price" value={addSalePrice}
            onChange={e => setAddSalePrice(e.target.value)} className="w-32" min="0" />
          <Button type="button" onClick={handleAddProduct} className="text-white rounded-none" style={{ backgroundColor: '#A68B6E' }}>Add</Button>
        </div>

        <div className="space-y-2">
          {saleProducts.map(sp => {
            const product = allProducts.find(p => p.id === sp.product_id)
            const slow = product ? isSlowMover(product, avgST) : false
            const discPct = product ? Math.round((1 - sp.sale_price / product.price) * 100) : 0
            return (
              <div key={sp.id} className="flex items-center justify-between py-2.5 px-3 rounded border"
                style={{ borderColor: slow ? '#FEE2E2' : '#F3F4F6', backgroundColor: slow ? '#FFF5F5' : 'white' }}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium">{product?.name || sp.product_id}</p>
                    {slow && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>Slow Mover</span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
                    {pkr(product?.price || 0)} → {pkr(sp.sale_price)}
                    <span className="ml-1.5 font-medium" style={{ color: '#DC2626' }}>(-{discPct}%)</span>
                    {product?.cost_price ? (
                      <span className="ml-1.5" style={{ color: '#9CA3AF' }}>
                        · profit/unit: {pkr(sp.sale_price - product.cost_price)}
                      </span>
                    ) : null}
                  </p>
                </div>
                <Button type="button" variant="outline" size="sm" className="rounded-none text-xs shrink-0"
                  style={{ borderColor: '#FCA5A5', color: '#B91C1C' }}
                  onClick={() => handleRemoveProduct(sp.product_id)}>
                  Remove
                </Button>
              </div>
            )
          })}
          {saleProducts.length === 0 && (
            <p className="text-sm" style={{ color: '#9CA3AF' }}>No products added yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}
