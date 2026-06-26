'use client'
import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import type { Sale, SaleProduct } from '@/types'

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

function pkr(n: number) { return `PKR ${Number(n).toLocaleString('en-US')}` }

export default function SaleAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [sale, setSale] = useState<Sale | null>(null)
  const [analytics, setAnalytics] = useState<SaleAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/sales').then(r => r.json()),
      fetch(`/api/admin/sales/${id}/analytics`).then(r => r.json()),
    ]).then(([sales, analyticsData]) => {
      const found = (sales as (Sale & { sale_products: SaleProduct[] })[]).find(s => s.id === id)
      if (found) setSale(found)
      setAnalytics(analyticsData as SaleAnalytics)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="p-4 text-sm" style={{ color: '#9CA3AF' }}>Loading…</div>

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/sales" className="text-xs hover:underline mb-1 block" style={{ color: '#A68B6E' }}>
            ← Back to Sales
          </Link>
          <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>
            {sale?.title || 'Sale'} — Analytics
          </h1>
        </div>
        <Link href={`/admin/sales/${id}/edit`}
          className="text-sm px-4 py-2 border rounded-none hover:bg-gray-50"
          style={{ borderColor: '#E8DDD4', color: '#1C1C1C' }}>
          Edit Sale
        </Link>
      </div>

      {/* Status + meta */}
      {sale && (
        <div className="flex items-center gap-3 text-sm" style={{ color: '#6B7280' }}>
          {sale.is_active
            ? <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block bg-green-500" />Active</span>
            : <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full inline-block bg-gray-400" />Inactive</span>}
          {analytics?.has_orders
            ? <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Live Data</span>
            : <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>Margin Preview</span>}
        </div>
      )}

      {analytics && analytics.saleProductData.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-sm" style={{ color: '#9CA3AF' }}>No products in this sale yet.</p>
          <Link href={`/admin/sales/${id}/edit`} className="text-sm mt-2 block hover:underline" style={{ color: '#A68B6E' }}>
            Add products →
          </Link>
        </div>
      )}

      {analytics && analytics.saleProductData.length > 0 && (
        <div className="space-y-6">

          {/* No orders yet — margin preview notice */}
          {!analytics.has_orders && (
            <div className="px-4 py-3 rounded-lg text-sm" style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E' }}>
              No orders through this sale yet — showing projected margins per unit if the sale goes live.
            </div>
          )}

          {/* KPI cards — live only */}
          {analytics.has_orders && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Sale Revenue',   value: pkr(analytics.totals.sale_revenue),       sub: `${analytics.totals.total_orders} orders`, color: '#1C1C1C' },
                { label: 'At Full Price',  value: pkr(analytics.totals.full_price_revenue),  sub: 'without the discount',                    color: '#6B7280' },
                { label: 'Discount Given', value: pkr(analytics.totals.sacrifice),            sub: 'given away to buyers',                    color: '#DC2626' },
                { label: 'Profit Earned',  value: pkr(analytics.totals.profit_at_sale),
                  sub: analytics.totals.cost_total > 0 ? `vs ${pkr(analytics.totals.profit_at_full)} at full price` : '',
                  color: '#166534' },
              ].map(card => (
                <div key={card.label} className="bg-white rounded-lg p-4 border text-center" style={{ borderColor: '#E8DDD4' }}>
                  <p className="text-lg font-bold" style={{ color: card.color }}>{card.value}</p>
                  <p className="text-xs font-medium mt-0.5" style={{ color: '#6B7280' }}>{card.label}</p>
                  {card.sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{card.sub}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Revenue trend chart — live only */}
          {analytics.has_orders && analytics.revenueTrend.length > 0 && (
            <div className="bg-white rounded-lg border p-5" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-sm font-medium mb-4">Daily Revenue — Sale Price vs Full Price</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.revenueTrend} barGap={2} barCategoryGap="30%">
                  <XAxis dataKey="date" tick={{ fontSize: 9 }}
                    tickFormatter={d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                  <YAxis tick={{ fontSize: 9 }} width={46}
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
              <div className="flex gap-4 mt-2 justify-end">
                {[['#A68B6E', 'Sale Revenue'], ['#E8DDD4', 'Full Price Equiv.']].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs" style={{ color: '#6B7280' }}>
                    <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Product breakdown table */}
          <div className="bg-white rounded-lg border p-5" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-sm font-medium mb-4">
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
                      <th key={h} className="text-left py-2 pr-3 font-medium text-right first:text-left"
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
                          <td className="py-2.5 text-right" style={{ color: '#DC2626' }}>{pkr(p.sacrifice)}</td>
                        </>
                      ) : (
                        <>
                          <td className="py-2.5 pr-3 text-right"
                            style={{ color: p.cost_price > 0 ? (p.sale_price - p.cost_price >= 0 ? '#166534' : '#DC2626') : '#9CA3AF' }}>
                            {p.cost_price > 0 ? pkr(p.sale_price - p.cost_price) : '—'}
                          </td>
                          <td className="py-2.5 text-right" style={{ color: p.cost_price > 0 ? '#166534' : '#9CA3AF' }}>
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
        </div>
      )}
    </div>
  )
}
