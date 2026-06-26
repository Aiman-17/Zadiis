'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Sale, SaleProduct, Product } from '@/types'

// ─── helpers ────────────────────────────────────────────────────────────────

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

// ─── types ───────────────────────────────────────────────────────────────────

type ProductRow = {
  product_id: string; product_name: string; cost_price: number
  original_price: number; sale_price: number; discount_pct: number
  units_sold: number; revenue_at_sale: number; revenue_at_full: number
  cost_total: number; profit_at_sale: number; profit_at_full: number; sacrifice: number
}
type SaleAnalytics = {
  is_active: boolean; has_orders: boolean
  saleProductData: ProductRow[]
  revenueTrend: { date: string; sale_revenue: number; full_revenue: number; orders: number }[]
  totals: { total_orders: number; sale_revenue: number; full_price_revenue: number; cost_total: number; profit_at_sale: number; profit_at_full: number; sacrifice: number }
}

// ─── component ───────────────────────────────────────────────────────────────

export default function EditSalePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sale, setSale] = useState<Sale | null>(null)
  const [saleProducts, setSaleProducts] = useState<SaleProduct[]>([])
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [analytics, setAnalytics] = useState<SaleAnalytics | null>(null)
  const [addProductId, setAddProductId] = useState('')
  const [addSalePrice, setAddSalePrice] = useState('')
  const [discountPct, setDiscountPct] = useState('20')
  const [applyingDiscount, setApplyingDiscount] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', is_active: false,
    delivery_charge_override: '', starts_at: '', ends_at: '',
  })

  const load = useCallback(async () => {
    const [salesRes, productsRes, analyticsRes] = await Promise.all([
      fetch('/api/admin/sales'),
      fetch('/api/admin/products'),
      fetch(`/api/admin/sales/${id}/analytics`),
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
    if (analyticsRes.ok) setAnalytics(await analyticsRes.json() as SaleAnalytics)
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

  if (!sale) return <div className="p-4">Loading...</div>

  // Smart product ordering: exclude new arrivals, slow movers first
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
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Edit Sale</h1>

      {/* ── Sale settings ── */}
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

      {/* ── Products in this sale ── */}
      <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-4">Products in this Sale</h2>

        {/* Bulk discount */}
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

        {/* Add product dropdown */}
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
            {availableProducts.map(p => {
              const slow = isSlowMover(p, avgST)
              return (
                <option key={p.id} value={p.id}>
                  {slow ? '⚠ ' : ''}{p.name} (PKR {p.price.toLocaleString()})
                </option>
              )
            })}
          </select>
          <Input type="number" placeholder="Sale price" value={addSalePrice}
            onChange={e => setAddSalePrice(e.target.value)} className="w-32" min="0" />
          <Button type="button" onClick={handleAddProduct} className="text-white rounded-none" style={{ backgroundColor: '#A68B6E' }}>Add</Button>
        </div>

        {/* Current sale products */}
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

      {/* ── Sale Analytics ── */}
      <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="font-semibold">Sale Analytics</h2>
          {analytics ? (
            analytics.has_orders ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Live Data</span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>Margin Preview</span>
            )
          ) : null}
        </div>

        {!analytics && (
          <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>Loading analytics…</p>
        )}

        {analytics && analytics.saleProductData.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: '#9CA3AF' }}>
            Add products to this sale to see margin analytics.
          </p>
        )}

        {analytics && analytics.saleProductData.length > 0 && (
          <>
            {/* State A — no orders yet */}
            {!analytics.has_orders && (
              <div className="mb-4 px-4 py-3 rounded-lg text-xs" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}>
                <p style={{ color: '#92400E' }}>
                  No orders through this sale yet. Showing projected margins — what you earn per unit if the sale goes live.
                </p>
              </div>
            )}

            {/* State B — live KPI row */}
            {analytics.has_orders && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Sale Revenue',   value: pkr(analytics.totals.sale_revenue),        sub: `${analytics.totals.total_orders} orders`,   color: '#1C1C1C' },
                  { label: 'At Full Price',  value: pkr(analytics.totals.full_price_revenue),   sub: 'what it would have been',                    color: '#6B7280' },
                  { label: 'Discount Given', value: pkr(analytics.totals.sacrifice),             sub: 'money sacrificed to buyer',                  color: '#DC2626', neg: true },
                  { label: 'Profit Earned',  value: pkr(analytics.totals.profit_at_sale),       sub: analytics.totals.cost_total > 0 ? `vs ${pkr(analytics.totals.profit_at_full)} at full price` : '', color: '#166534' },
                ].map(card => (
                  <div key={card.label} className="rounded-lg p-3 text-center border" style={{ borderColor: '#E8DDD4' }}>
                    <p className="text-base font-bold" style={{ color: card.color }}>{card.value}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: '#6B7280' }}>{card.label}</p>
                    {card.sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{card.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Revenue chart — only when there are orders */}
            {analytics.has_orders && analytics.revenueTrend.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>
                  Daily Revenue — Sale Price vs Full Price
                </p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.revenueTrend} barGap={2} barCategoryGap="30%">
                    <XAxis dataKey="date" tick={{ fontSize: 9 }}
                      tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                    <YAxis tick={{ fontSize: 9 }} width={42}
                      tickFormatter={v => Number(v) >= 1000 ? `${Math.round(Number(v) / 1000)}k` : String(v)} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { sale_revenue: number; full_revenue: number; orders: number }
                      return (
                        <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">
                            {new Date(String(label) + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p style={{ color: '#A68B6E' }}>Sale revenue: {pkr(d.sale_revenue)}</p>
                          <p style={{ color: '#9CA3AF' }}>Full price equiv: {pkr(d.full_revenue)}</p>
                          <p style={{ color: '#DC2626' }}>Discount given: {pkr(d.full_revenue - d.sale_revenue)}</p>
                          <p style={{ color: '#374151' }}>{d.orders} order{d.orders !== 1 ? 's' : ''}</p>
                        </div>
                      )
                    }} />
                    <Bar dataKey="full_revenue" name="Full Price" radius={[2, 2, 0, 0]}>
                      {analytics.revenueTrend.map((_, i) => <Cell key={i} fill="#E8DDD4" />)}
                    </Bar>
                    <Bar dataKey="sale_revenue" name="Sale Revenue" radius={[2, 2, 0, 0]}>
                      {analytics.revenueTrend.map((_, i) => <Cell key={i} fill="#A68B6E" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-4 mt-1 justify-end">
                  {[['#A68B6E', 'Sale Revenue'], ['#E8DDD4', 'Full Price Equiv.']].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Per-product breakdown table */}
            <div>
              <p className="text-xs font-medium mb-2" style={{ color: '#6B7280' }}>
                {analytics.has_orders ? 'Product Performance' : 'Projected Margin per Product'}
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead>
                    <tr className="border-b" style={{ borderColor: '#F3F4F6' }}>
                      {['Product', 'Cost', 'Full Price', 'Sale Price', 'Disc %',
                        ...(analytics.has_orders
                          ? ['Sold', 'Revenue', 'Profit', 'Sacrificed']
                          : ['Profit/unit (sale)', 'Profit/unit (full)'])
                      ].map(h => (
                        <th key={h} className="text-left py-2 pr-3 font-medium first:text-left text-right first:pl-0"
                          style={{ color: '#9CA3AF' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.saleProductData.map(p => (
                      <tr key={p.product_id} className="border-b last:border-0" style={{ borderColor: '#F9FAFB' }}>
                        <td className="py-2.5 pr-3 font-medium">{p.product_name}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: '#9CA3AF' }}>
                          {p.cost_price > 0 ? pkr(p.cost_price) : '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right">{pkr(p.original_price)}</td>
                        <td className="py-2.5 pr-3 text-right font-medium" style={{ color: '#A68B6E' }}>{pkr(p.sale_price)}</td>
                        <td className="py-2.5 pr-3 text-right">
                          <span className="px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                            -{p.discount_pct}%
                          </span>
                        </td>
                        {analytics.has_orders ? (
                          <>
                            <td className="py-2.5 pr-3 text-right font-medium">{p.units_sold}</td>
                            <td className="py-2.5 pr-3 text-right">{pkr(p.revenue_at_sale)}</td>
                            <td className="py-2.5 pr-3 text-right"
                              style={{ color: p.profit_at_sale >= 0 ? '#166534' : '#DC2626' }}>
                              {pkr(p.profit_at_sale)}
                            </td>
                            <td className="py-2.5 text-right" style={{ color: '#DC2626' }}>
                              {pkr(p.sacrifice)}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-2.5 pr-3 text-right"
                              style={{ color: p.cost_price > 0 ? (p.sale_price - p.cost_price >= 0 ? '#166534' : '#DC2626') : '#9CA3AF' }}>
                              {p.cost_price > 0 ? pkr(p.sale_price - p.cost_price) : '—'}
                            </td>
                            <td className="py-2.5 text-right"
                              style={{ color: p.cost_price > 0 ? '#166534' : '#9CA3AF' }}>
                              {p.cost_price > 0 ? pkr(p.original_price - p.cost_price) : '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  {analytics.has_orders && (
                    <tfoot>
                      <tr className="border-t font-semibold" style={{ borderColor: '#E8DDD4' }}>
                        <td colSpan={4} className="py-2.5 pr-3">Total</td>
                        <td className="py-2.5 pr-3 text-right">{analytics.totals.total_orders} orders</td>
                        <td className="py-2.5 pr-3 text-right">{pkr(analytics.totals.sale_revenue)}</td>
                        <td className="py-2.5 pr-3 text-right" style={{ color: '#166534' }}>
                          {pkr(analytics.totals.profit_at_sale)}
                        </td>
                        <td className="py-2.5 text-right" style={{ color: '#DC2626' }}>
                          {pkr(analytics.totals.sacrifice)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
