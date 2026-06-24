'use client'
import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import type { Order, OrderItem, Product } from '@/types'

const RANGE_OPTIONS = [
  { key: '7d',  label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
  { key: '12m', label: '12 Months' },
]

const PAYMENT_COLORS = ['#A68B6E', '#1C1C1C', '#C9956C', '#8B7355']

const CANCEL_REASON_LABELS: Record<string, string> = {
  customer_changed_mind: 'Changed Mind',
  no_response:           'No Response',
  wrong_address:         'Wrong Address',
  duplicate_order:       'Duplicate',
  out_of_stock:          'Out of Stock',
  delivery_delay:        'Delivery Delay',
  other:                 'Other',
}

type Tab = 'revenue' | 'products' | 'inventory' | 'cancellations'

function pkr(n: number) { return `PKR ${Number(n).toLocaleString()}` }

function buildTrendData(orders: Order[], range: string) {
  const isMonthly = range === '12m'
  const map: Record<string, { label: string; revenue: number; orders: number }> = {}

  orders.forEach(o => {
    const d = new Date(o.created_at)
    const key = isMonthly
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : d.toISOString().slice(0, 10)
    const label = isMonthly
      ? d.toLocaleString('default', { month: 'short' })
      : d.toLocaleDateString('default', { month: 'short', day: 'numeric' })
    if (!map[key]) map[key] = { label, revenue: 0, orders: 0 }
    if (o.order_status !== 'cancelled' && o.order_status !== 'returned') {
      map[key].revenue += o.total
      map[key].orders += 1
    }
  })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

export default function AnalyticsClient({
  orders,
  products,
  range,
}: {
  orders: Order[]
  products: Product[]
  range: string
}) {
  const [tab, setTab] = useState<Tab>('revenue')
  const router = useRouter()
  const pathname = usePathname()

  const setRange = (r: string) => router.push(`${pathname}?range=${r}`)

  // Revenue
  const grossRevenue   = orders.reduce((s, o) => s + o.total, 0)
  const cancelledOrders = orders.filter(o => o.order_status === 'cancelled')
  const returnedOrders  = orders.filter(o => o.order_status === 'returned')
  const cancelledRev   = cancelledOrders.reduce((s, o) => s + o.total, 0)
  const returnedRev    = returnedOrders.reduce((s, o) => s + o.total, 0)
  const netRevenue     = grossRevenue - cancelledRev - returnedRev
  const discountsGiven = orders
    .filter(o => o.order_status !== 'cancelled')
    .reduce((s, o) =>
      s + (o.items as OrderItem[]).reduce((si, i) =>
        si + ((i.original_price ?? i.price) - i.price) * i.quantity, 0
      ), 0
    )

  // Profit — only for paid non-COD orders and delivered COD orders
  const costMap = Object.fromEntries(products.map(p => [p.id, p.cost_price || 0]))
  const qualifyingOrders = orders.filter(o =>
    o.order_status !== 'cancelled' &&
    o.order_status !== 'returned' &&
    (o.payment_method === 'cod'
      ? o.order_status === 'delivered'
      : o.payment_status === 'paid')
  )
  const grossProfit = qualifyingOrders.reduce((s, o) =>
    s + (o.items as OrderItem[]).reduce((si, i) => {
      const cost = costMap[i.product_id] || 0
      return si + (i.price - cost) * i.quantity
    }, 0), 0
  )
  const profitMarginPct = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100) : 0
  // How much profit was sacrificed by giving sale/manual discounts on qualifying orders
  const profitLostToDiscounts = qualifyingOrders.reduce((s, o) =>
    s + (o.items as OrderItem[]).reduce((si, i) => {
      const originalPrice = i.original_price ?? i.price
      return si + (originalPrice - i.price) * i.quantity
    }, 0), 0
  )

  const trendData = buildTrendData(orders, range)

  // Payment methods
  const paymentMap: Record<string, number> = {}
  orders.filter(o => o.order_status !== 'cancelled').forEach(o => {
    paymentMap[o.payment_method] = (paymentMap[o.payment_method] || 0) + 1
  })
  const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }))

  // Top products
  const productMap: Record<string, { units: number; revenue: number }> = {}
  orders.filter(o => o.order_status !== 'cancelled').forEach(o =>
    (o.items as OrderItem[]).forEach(i => {
      if (!productMap[i.product_name]) productMap[i.product_name] = { units: 0, revenue: 0 }
      productMap[i.product_name].units += i.quantity
      productMap[i.product_name].revenue += i.price * i.quantity
    })
  )
  const topProducts = Object.entries(productMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Colors, Sizes, Cities
  const colorMap: Record<string, number> = {}
  const sizeMap:  Record<string, number> = {}
  const cityMap:  Record<string, number> = {}
  orders.filter(o => o.order_status !== 'cancelled').forEach(o => {
    cityMap[o.city] = (cityMap[o.city] || 0) + 1
    ;(o.items as OrderItem[]).forEach(i => {
      if (i.color && i.color !== '_') colorMap[i.color] = (colorMap[i.color] || 0) + i.quantity
      if (i.size  && i.size  !== '_') sizeMap[i.size]   = (sizeMap[i.size]   || 0) + i.quantity
    })
  })
  const topColors = Object.entries(colorMap).map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 8)
  const topSizes  = Object.entries(sizeMap) .map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 8)
  const topCities = Object.entries(cityMap) .map(([name, count]) => ({ name, units: count })).sort((a, b) => b.units - a.units).slice(0, 8)

  // Inventory
  const lowStockItems: { name: string; variant: string; qty: number }[] = []
  let inventoryValue = 0
  products.forEach(p => {
    inventoryValue += p.price * p.stock_quantity
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) =>
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty <= 5) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      )
    } else if (p.stock_quantity <= 5) {
      lowStockItems.push({ name: p.name, variant: 'All sizes', qty: p.stock_quantity })
    }
  })
  lowStockItems.sort((a, b) => a.qty - b.qty)

  // Cancellations
  const reasonMap: Record<string, number> = {}
  cancelledOrders.forEach(o => {
    const r = o.cancellation_reason || 'other'
    reasonMap[r] = (reasonMap[r] || 0) + 1
  })
  const reasonData = Object.entries(reasonMap)
    .map(([key, count]) => ({ name: CANCEL_REASON_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
  const cancellationRate = orders.length > 0
    ? ((cancelledOrders.length / orders.length) * 100).toFixed(1)
    : '0.0'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'revenue',       label: 'Revenue' },
    { key: 'products',      label: 'Products' },
    { key: 'inventory',     label: 'Inventory' },
    { key: 'cancellations', label: 'Cancellations' },
  ]

  return (
    <div className="space-y-6">
      {/* Date range */}
      <div className="flex gap-2 flex-wrap">
        {RANGE_OPTIONS.map(r => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className="text-xs px-4 py-1.5 rounded-full border transition-colors"
            style={range === r.key
              ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
              : { borderColor: '#E8DDD4', color: '#6B7280' }}>
            {r.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b" style={{ borderColor: '#E8DDD4' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            style={tab === t.key
              ? { borderColor: '#A68B6E', color: '#1C1C1C' }
              : { borderColor: 'transparent', color: '#9CA3AF' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Revenue Tab */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Gross Revenue', value: pkr(grossRevenue), color: '#1C1C1C' },
              { label: 'Net Revenue',   value: pkr(netRevenue),   color: '#10B981' },
              { label: 'Gross Profit',  value: pkr(grossProfit),  color: grossProfit >= 0 ? '#10B981' : '#EF4444',
                sub: `${profitMarginPct}% margin` },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                {'sub' in k && k.sub && (
                  <p className="text-xs mt-0.5" style={{ color: '#A68B6E' }}>{k.sub}</p>
                )}
              </div>
            ))}
          </div>

          {/* Discount impact — only shown when discounts were given */}
          {profitLostToDiscounts > 0 && (
            <div className="rounded-lg px-4 py-3 flex items-center justify-between text-sm"
              style={{ backgroundColor: '#FFF8F2', border: '1px solid #F0E4D4' }}>
              <span style={{ color: '#6B7280' }}>
                Profit reduced by discounts/sales this period:
              </span>
              <span className="font-semibold" style={{ color: '#C62828' }}>
                −{pkr(profitLostToDiscounts)}
              </span>
            </div>
          )}

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} width={50} />
                <Tooltip formatter={(v) => pkr(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#A68B6E" strokeWidth={2.5}
                  dot={{ fill: '#A68B6E', r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Orders Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} width={30} />
                  <Tooltip />
                  <Line type="monotone" dataKey="orders" stroke="#1C1C1C" strokeWidth={2}
                    dot={{ fill: '#1C1C1C', r: 3 }} name="Orders" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Payment Methods</h3>
              {paymentData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={paymentData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                        {paymentData.map((_, i) => (
                          <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                    {paymentData.map((p, i) => (
                      <div key={p.name} className="flex items-center gap-1.5 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
                        <span style={{ color: '#4B5563' }}>{p.name} ({p.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No data.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {tab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Top Selling Products</h3>
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110}
                    tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + '…' : v} />
                  <Tooltip formatter={(v, name) => [
                    name === 'units' ? `${v} units` : pkr(Number(v)),
                    name === 'units' ? 'Units Sold' : 'Revenue',
                  ]} />
                  <Bar dataKey="units" fill="#A68B6E" radius={[0, 4, 4, 0]} name="units" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No sales in this period.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'Top Colors', data: topColors },
              { title: 'Top Sizes',  data: topSizes },
              { title: 'Top Cities', data: topCities },
            ].map(chart => (
              <div key={chart.title} className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold mb-4">{chart.title}</h3>
                {chart.data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chart.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                      <Tooltip />
                      <Bar dataKey="units" fill="#A68B6E" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No data.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg p-4 border inline-block" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-2xl font-bold">{pkr(inventoryValue)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Inventory Value</p>
          </div>

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">
              Low Stock & Out of Stock
              {lowStockItems.length > 0 && (
                <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
                  {lowStockItems.length} variants
                </span>
              )}
            </h3>
            {lowStockItems.length === 0 ? (
              <p className="text-sm" style={{ color: '#10B981' }}>All products are well stocked.</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                    style={{ borderColor: '#F3F4F6' }}>
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      {item.variant && <p className="text-xs" style={{ color: '#6B7280' }}>{item.variant}</p>}
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={item.qty === 0
                        ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                        : { backgroundColor: '#FEF9C3', color: '#92400E' }}>
                      {item.qty === 0 ? 'OUT OF STOCK' : `${item.qty} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancellations Tab */}
      {tab === 'cancellations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Cancellation Rate', value: `${cancellationRate}%`, color: '#EF4444' },
              { label: 'Orders Cancelled',  value: cancelledOrders.length, color: '#1C1C1C' },
              { label: 'Revenue Lost',      value: pkr(cancelledRev),      color: '#EF4444' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Cancellation Reasons</h3>
            {reasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={reasonData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF4444" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
                No cancellations in this period.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
