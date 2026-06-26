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
  changed_mind:          'Changed Mind',
  no_response:           'No Response',
  wrong_address:         'Wrong Address',
  duplicate_order:       'Duplicate',
  out_of_stock:          'Out of Stock',
  delivery_delay:        'Delivery Delay',
  delivery_too_slow:     'Delivery Too Slow',
  ordered_by_mistake:    'Ordered by Mistake',
  found_better_price:    'Found Better Price',
  other:                 'Other',
}

const RETURN_REASON_LABELS: Record<string, string> = {
  wrong_size:      'Wrong Size',
  defective_item:  'Defective / Damaged',
  wrong_item_sent: 'Wrong Item Sent',
  changed_mind:    'Changed Mind',
  exchange:        'Exchange Request',
  other:           'Other',
}

type Tab = 'revenue' | 'trend' | 'products' | 'inventory' | 'merchandising' | 'cancellations' | 'returns'

function pkr(n: number) { return `PKR ${Number(n).toLocaleString()}` }

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildAllBuckets(range: string, longMonthLabel = false) {
  const today = new Date()
  const map: Record<string, { label: string; revenue: number; orders: number }> = {}

  if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = longMonthLabel
        ? d.toLocaleString('default', { month: 'long', year: 'numeric' })
        : d.toLocaleString('default', { month: 'short', year: '2-digit' })
      map[key] = { label, revenue: 0, orders: 0 }
    }
  } else if (range === '90d') {
    const start = new Date(today)
    start.setDate(today.getDate() - 90)
    const ws = new Date(start)
    ws.setDate(start.getDate() - start.getDay())
    const cur = new Date(ws)
    while (cur <= today) {
      const key = localDateKey(cur)
      const label = `Week of ${cur.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
      map[key] = { label, revenue: 0, orders: 0 }
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    const days = range === '7d' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = localDateKey(d)
      map[key] = { label: '', revenue: 0, orders: 0 }
    }
  }
  return map
}

function buildTrendData(orders: Order[], range: string) {
  const isMonthly = range === '12m'
  const map = buildAllBuckets(range, false)

  // Fill in daily labels (need locale formatting per-day)
  if (!isMonthly && range !== '90d') {
    Object.keys(map).forEach(key => {
      const [y, m, day] = key.split('-').map(Number)
      const d = new Date(y, m - 1, day)
      map[key].label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' })
    })
  }

  orders.forEach(o => {
    if (o.order_status === 'cancelled' || o.order_status === 'returned') return
    const d = new Date(o.created_at)
    const key = isMonthly
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      : localDateKey(d)
    if (map[key]) {
      map[key].revenue += o.total
      map[key].orders  += 1
    }
  })

  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)
}

function buildSalesTrendTable(orders: Order[], range: string) {
  const isMonthly = range === '12m'
  const isWeekly  = range === '90d'
  const map = buildAllBuckets(range, true)

  // Fill in daily labels with weekday
  if (!isMonthly && !isWeekly) {
    Object.keys(map).forEach(key => {
      const [y, m, day] = key.split('-').map(Number)
      const d = new Date(y, m - 1, day)
      map[key].label = d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })
    })
  }

  orders.forEach(o => {
    if (o.order_status === 'cancelled' || o.order_status === 'returned') return
    const d = new Date(o.created_at)
    let key: string

    if (isMonthly) {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    } else if (isWeekly) {
      const ws = new Date(d)
      ws.setDate(d.getDate() - d.getDay())
      key = localDateKey(ws)
    } else {
      key = localDateKey(d)
    }

    if (map[key]) {
      map[key].revenue += o.total
      map[key].orders  += 1
    }
  })

  const rows = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v)

  return rows.map((row, i) => {
    const prev   = rows[i - 1]
    const growth = prev && prev.revenue > 0
      ? Math.round(((row.revenue - prev.revenue) / prev.revenue) * 100)
      : null
    return { ...row, growth }
  })
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

  const trendData      = buildTrendData(orders, range)
  const salesTrendRows = buildSalesTrendTable(orders, range)

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
          if (qty <= 3) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      )
    } else if (p.stock_quantity <= 3) {
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

  // Returns
  const returnReasonMap: Record<string, number> = {}
  returnedOrders.forEach(o => {
    const r = (o as Order & { return_reason?: string }).return_reason || 'other'
    returnReasonMap[r] = (returnReasonMap[r] || 0) + 1
  })
  const returnReasonData = Object.entries(returnReasonMap)
    .map(([key, count]) => ({ name: RETURN_REASON_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
  const returnRate = orders.length > 0
    ? ((returnedOrders.length / orders.length) * 100).toFixed(1)
    : '0.0'

  // ── Merchandising ──────────────────────────────────────────────────────────
  function getMerchStock(p: Product): number {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).reduce(
        (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
      )
    }
    return p.stock_quantity
  }

  // Category performance (from range orders)
  const productCategoryMap = Object.fromEntries(products.map(p => [p.id, p.product_category || 'Uncategorized']))
  const categoryPerfMap: Record<string, { revenue: number; units: number; orderCount: number }> = {}
  orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned').forEach(o => {
    const catsInOrder = new Set<string>()
    ;(o.items as OrderItem[]).forEach(item => {
      const cat = productCategoryMap[item.product_id] || 'Uncategorized'
      if (!categoryPerfMap[cat]) categoryPerfMap[cat] = { revenue: 0, units: 0, orderCount: 0 }
      categoryPerfMap[cat].revenue += item.price * item.quantity
      categoryPerfMap[cat].units   += item.quantity
      catsInOrder.add(cat)
    })
    catsInOrder.forEach(cat => { categoryPerfMap[cat].orderCount += 1 })
  })
  const categoryPerf = Object.entries(categoryPerfMap)
    .map(([cat, d]) => ({ cat, ...d }))
    .sort((a, b) => b.revenue - a.revenue)

  // Price range performance
  const priceRangeBuckets = [
    { label: 'Under 1.5k', min: 0,    max: 1500 },
    { label: '1.5k – 3k',  min: 1500, max: 3000 },
    { label: '3k – 5k',    min: 3000, max: 5000 },
    { label: '5k+',        min: 5000, max: Infinity },
  ]
  const priceRefMap = Object.fromEntries(products.map(p => [p.id, p.price]))
  const priceRangeStats = priceRangeBuckets.map(r => {
    let rev = 0, units = 0, cnt = 0
    orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned').forEach(o => {
      let inRange = false
      ;(o.items as OrderItem[]).forEach(item => {
        const price = priceRefMap[item.product_id] ?? item.price
        if (price >= r.min && price < r.max) { rev += item.price * item.quantity; units += item.quantity; inRange = true }
      })
      if (inRange) cnt++
    })
    return { label: r.label, revenue: rev, units, orderCount: cnt }
  })

  // Size sell-through (sold vs remaining stock)
  const sizeInventory: Record<string, number> = {}
  products.forEach(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      Object.values(vs).forEach(sizes =>
        Object.entries(sizes).forEach(([sz, qty]) => {
          if (sz !== '_') sizeInventory[sz] = (sizeInventory[sz] || 0) + (qty as number)
        })
      )
    }
  })
  const sizeSellThrough = Object.entries(sizeMap)
    .map(([sz, sold]) => {
      const remaining = sizeInventory[sz] || 0
      const total = sold + remaining
      const pct = total > 0 ? Math.round((sold / total) * 100) : 0
      return { sz, sold, remaining, pct }
    })
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 10)

  // Slow movers: 0 sales + older than 15 days + still in stock
  const slowMovers = products
    .filter(p => {
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
      if (ageDays < 15) return false
      const stock = getMerchStock(p)
      if (stock === 0) return false
      return p.total_sold === 0
    })
    .map(p => {
      const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return { ...p, ageDays: Math.floor(ageDays), velocity: p.total_sold / ageDays, stock: getMerchStock(p) }
    })
    .sort((a, b) => a.velocity - b.velocity)

  // Dead inventory (no sales + stock ≥ 10 + older than 15 days)
  const deadInventory = products
    .filter(p => {
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
      return ageDays > 15 && p.total_sold === 0 && getMerchStock(p) >= 10
    })
    .map(p => ({ ...p, stock: getMerchStock(p), ageDays: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) }))
    .sort((a, b) => b.stock - a.stock)

  // New arrivals (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const newArrivals = products
    .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
    .map(p => {
      const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return { ...p, ageDays: Math.floor(ageDays), velocity: p.total_sold / ageDays, stock: getMerchStock(p) }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // ── Inventory tab: category breakdown + flag signals ──────────────────────
  const categoryStockMap: Record<string, { stock: number; sold: number; count: number }> = {}
  products.forEach(p => {
    const cat = p.product_category || 'Uncategorized'
    if (!categoryStockMap[cat]) categoryStockMap[cat] = { stock: 0, sold: 0, count: 0 }
    categoryStockMap[cat].stock += getMerchStock(p)
    categoryStockMap[cat].sold  += p.total_sold
    categoryStockMap[cat].count++
  })
  const categoryStockData = Object.entries(categoryStockMap)
    .map(([cat, d]) => ({ cat, ...d }))
    .sort((a, b) => b.stock - a.stock)

  const invBestSellers = products
    .filter(p => p.is_bestseller || p.best_seller_score > 0)
    .sort((a, b) => (b.is_bestseller ? 1 : 0) - (a.is_bestseller ? 1 : 0) || b.best_seller_score - a.best_seller_score)
    .slice(0, 8)
    .map(p => ({ ...p, stock: getMerchStock(p) }))

  const invTrending = products
    .filter(p => p.is_trending || p.trending_score > 0)
    .sort((a, b) => (b.is_trending ? 1 : 0) - (a.is_trending ? 1 : 0) || b.trending_score - a.trending_score)
    .slice(0, 8)
    .map(p => ({ ...p, stock: getMerchStock(p) }))

  const invNewArrivals = products
    .filter(p => p.is_new_arrival || new Date(p.created_at) >= thirtyDaysAgo)
    .sort((a, b) => (b.is_new_arrival ? 1 : 0) - (a.is_new_arrival ? 1 : 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8)
    .map(p => ({ ...p, stock: getMerchStock(p) }))

  const TABS: { key: Tab; label: string }[] = [
    { key: 'revenue',       label: 'Revenue' },
    { key: 'trend',         label: 'Sales Trend' },
    { key: 'products',      label: 'Products' },
    { key: 'inventory',     label: 'Inventory' },
    { key: 'merchandising', label: 'Merchandising' },
    { key: 'cancellations', label: 'Cancellations' },
    { key: 'returns',       label: 'Returns' },
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

      {/* Sales Trend Tab */}
      {tab === 'trend' && (
        <div className="space-y-6">
          {/* Chart — orders per period, revenue on hover */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Sales Trend</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {range === '12m' ? 'Monthly' : range === '90d' ? 'Weekly' : 'Daily'} · hover for revenue
              </span>
            </div>
            {salesTrendRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={salesTrendRows} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { orders: number; revenue: number }
                      return (
                        <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{label}</p>
                          <p style={{ color: '#1C1C1C' }}>{d.orders} order{d.orders !== 1 ? 's' : ''}</p>
                          <p style={{ color: '#A68B6E' }}>PKR {d.revenue.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]} name="Orders">
                    {salesTrendRows.map((entry, i) => (
                      <Cell key={i} fill={entry.orders > 0 ? '#A68B6E' : '#E8DDD4'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No sales in this period.</p>
            )}
          </div>

          {/* Period breakdown table */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold text-sm">Period Breakdown</h3>
            </div>
            {salesTrendRows.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No data for this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                    <tr>
                      <th className="text-left px-5 py-3 font-medium" style={{ color: '#6B7280' }}>Period</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: '#6B7280' }}>Orders</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: '#6B7280' }}>Revenue</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: '#6B7280' }}>vs Prev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...salesTrendRows].reverse().map((row, i) => (
                      <tr key={i} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-5 py-3">{row.label}</td>
                        <td className="px-5 py-3 text-right" style={{ color: '#6B7280' }}>{row.orders}</td>
                        <td className="px-5 py-3 text-right font-medium">
                          PKR {row.revenue.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {row.growth === null ? (
                            <span style={{ color: '#D1D5DB' }}>—</span>
                          ) : row.growth === 0 ? (
                            <span style={{ color: '#9CA3AF' }}>0%</span>
                          ) : row.growth > 0 ? (
                            <span className="font-medium" style={{ color: '#10B981' }}>↑ {row.growth}%</span>
                          ) : (
                            <span className="font-medium" style={{ color: '#EF4444' }}>↓ {Math.abs(row.growth)}%</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t" style={{ borderColor: '#E8DDD4' }}>
                    <tr style={{ backgroundColor: '#FAF8F5' }}>
                      <td className="px-5 py-3 font-semibold">Total</td>
                      <td className="px-5 py-3 text-right font-semibold">
                        {salesTrendRows.reduce((s, r) => s + r.orders, 0)}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">
                        PKR {salesTrendRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}
                      </td>
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
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

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold">{pkr(inventoryValue)}</p>
              <p className="text-xs text-gray-500 mt-1">Inventory Value</p>
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold">{invBestSellers.length}</p>
              <p className="text-xs mt-1" style={{ color: '#92400E' }}>Best Sellers tracked</p>
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold">{invTrending.length}</p>
              <p className="text-xs mt-1" style={{ color: '#9D174D' }}>Trending products</p>
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold">{invNewArrivals.length}</p>
              <p className="text-xs mt-1" style={{ color: '#5B21B6' }}>New Arrivals (30d)</p>
            </div>
          </div>

          {/* Category inventory bar chart */}
          {categoryStockData.length > 0 && (
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-1">Stock by Collection</h3>
              <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>Hover to see units sold vs remaining</p>
              <ResponsiveContainer width="100%" height={Math.max(160, categoryStockData.length * 40)}>
                <BarChart data={categoryStockData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { cat: string; stock: number; sold: number; count: number }
                      const total = d.stock + d.sold
                      const pct = total > 0 ? Math.round((d.sold / total) * 100) : 0
                      return (
                        <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{d.cat}</p>
                          <p>{d.stock} units in stock</p>
                          <p style={{ color: '#A68B6E' }}>{d.sold} units sold</p>
                          <p style={{ color: '#6B7280' }}>{pct}% sell-through · {d.count} products</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="stock" fill="#A68B6E" radius={[0, 4, 4, 0]} name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Flag-based restock signals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* ★ Best Sellers */}
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4', backgroundColor: '#FFFBEB' }}>
                <span className="text-sm font-semibold" style={{ color: '#92400E' }}>★ Best Sellers</span>
                <span className="text-xs ml-auto" style={{ color: '#B45309' }}>restock priority</span>
              </div>
              {invBestSellers.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>No best sellers yet. Flag products or let scoring run.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {invBestSellers.map(p => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.total_sold} sold</p>
                      </div>
                      <span className="text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded"
                        style={p.stock === 0
                          ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                          : p.stock <= 5
                          ? { backgroundColor: '#FEF9C3', color: '#92400E' }
                          : { backgroundColor: '#F0FDF4', color: '#166534' }}>
                        {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ↑ Trending */}
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4', backgroundColor: '#FDF2F8' }}>
                <span className="text-sm font-semibold" style={{ color: '#9D174D' }}>↑ Trending</span>
                <span className="text-xs ml-auto" style={{ color: '#BE185D' }}>moving fast</span>
              </div>
              {invTrending.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>No trending products yet. Scoring updates after orders.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {invTrending.map(p => (
                    <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{p.name}</p>
                        <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.total_sold} sold · ↑{p.trending_score.toFixed(1)}</p>
                      </div>
                      <span className="text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded"
                        style={p.stock === 0
                          ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                          : p.stock <= 5
                          ? { backgroundColor: '#FEF9C3', color: '#92400E' }
                          : { backgroundColor: '#F0FDF4', color: '#166534' }}>
                        {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ✦ New Arrivals */}
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4', backgroundColor: '#F5F3FF' }}>
                <span className="text-sm font-semibold" style={{ color: '#5B21B6' }}>✦ New Arrivals</span>
                <span className="text-xs ml-auto" style={{ color: '#6D28D9' }}>last 30 days</span>
              </div>
              {invNewArrivals.length === 0 ? (
                <p className="px-4 py-3 text-xs" style={{ color: '#9CA3AF' }}>No new arrivals in the last 30 days.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                  {invNewArrivals.map(p => {
                    const ageDays = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000)
                    return (
                      <div key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{p.name}</p>
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>
                            {ageDays === 0 ? 'today' : `${ageDays}d ago`} · {p.total_sold} sold
                          </p>
                        </div>
                        <span className="text-xs font-semibold shrink-0 px-1.5 py-0.5 rounded"
                          style={p.stock === 0
                            ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                            : p.stock <= 5
                            ? { backgroundColor: '#FEF9C3', color: '#92400E' }
                            : { backgroundColor: '#F0FDF4', color: '#166534' }}>
                          {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Merchandising Tab */}
      {tab === 'merchandising' && (
        <div className="space-y-6">

          {/* Category Performance */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Category Performance</h3>
            {categoryPerf.length === 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No sales data — add a Season/Type to products first.</p>
            ) : (
              <div className="space-y-3">
                {categoryPerf.map(c => {
                  const maxRev = categoryPerf[0].revenue
                  const barPct = maxRev > 0 ? Math.round((c.revenue / maxRev) * 100) : 0
                  return (
                    <div key={c.cat}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{c.cat}</span>
                        <span style={{ color: '#6B7280' }}>
                          PKR {c.revenue.toLocaleString()} · {c.units} units · {c.orderCount} orders
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, backgroundColor: '#A68B6E' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Price Range Performance */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Price Range Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priceRangeStats.map(r => (
                <div key={r.label} className="rounded-lg p-3 border text-center" style={{ borderColor: '#E8DDD4' }}>
                  <p className="text-sm font-semibold" style={{ color: '#A68B6E' }}>{r.label}</p>
                  <p className="text-lg font-bold mt-1">{r.units}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>units sold</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: '#374151' }}>
                    PKR {Math.round(r.revenue / 1000)}k
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Size Sell-Through */}
          {sizeSellThrough.length > 0 && (
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Size Sell-Through</h3>
              <div className="space-y-2.5">
                {sizeSellThrough.map(s => (
                  <div key={s.sz} className="flex items-center gap-3">
                    <span className="w-10 text-sm font-medium text-right shrink-0">{s.sz}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${s.pct}%`, backgroundColor: s.pct >= 70 ? '#10B981' : s.pct >= 40 ? '#A68B6E' : '#F59E0B' }} />
                    </div>
                    <span className="text-xs shrink-0 w-12 text-right font-medium" style={{ color: '#6B7280' }}>{s.pct}%</span>
                    <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>{s.sold} sold / {s.remaining} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Arrivals Performance */}
          {newArrivals.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold text-sm">New Arrivals (last 30 days)</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: '#E8DDD4' }}>
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Product</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Age</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Sold</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Stock</th>
                    <th className="text-right px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {newArrivals.map(p => (
                    <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-5 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: '#9CA3AF' }}>{p.ageDays}d ago</td>
                      <td className="px-4 py-3 text-right">{p.total_sold}</td>
                      <td className="px-4 py-3 text-right">{p.stock}</td>
                      <td className="px-5 py-3 text-right text-xs">
                        {p.velocity >= 1 ? (
                          <span style={{ color: '#10B981' }}>{p.velocity.toFixed(1)}/d</span>
                        ) : p.velocity > 0 ? (
                          <span style={{ color: '#F59E0B' }}>{p.velocity.toFixed(2)}/d</span>
                        ) : (
                          <span style={{ color: '#D1D5DB' }}>no sales</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Slow Movers */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold text-sm">Slow Movers</h3>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                {slowMovers.length}
              </span>
              <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>0 sales · 15+ days old · in stock</span>
            </div>
            {slowMovers.length === 0 ? (
              <p className="px-5 py-4 text-sm" style={{ color: '#10B981' }}>No slow movers — all products are selling well.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: '#E8DDD4' }}>
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Product</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Age</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Sold</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Stock</th>
                    <th className="text-right px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {slowMovers.slice(0, 15).map(p => (
                    <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.product_category && (
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: '#9CA3AF' }}>{p.ageDays}d</td>
                      <td className="px-4 py-3 text-right">{p.total_sold}</td>
                      <td className="px-4 py-3 text-right">{p.stock}</td>
                      <td className="px-5 py-3 text-right text-xs font-medium" style={{ color: '#DC2626' }}>
                        {p.velocity > 0 ? `${p.velocity.toFixed(2)}/d` : 'no sales'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Dead Inventory */}
          {deadInventory.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold text-sm">Dead Inventory</h3>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>
                  {deadInventory.length}
                </span>
                <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>0 sales · stock ≥ 10 · 15+ days old</span>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: '#E8DDD4' }}>
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Product</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Age</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Stock</th>
                    <th className="text-right px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {deadInventory.map(p => (
                    <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.product_category && (
                          <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: '#9CA3AF' }}>{p.ageDays}d</td>
                      <td className="px-4 py-3 text-right font-medium" style={{ color: '#EF4444' }}>{p.stock}</td>
                      <td className="px-5 py-3 text-right">PKR {p.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

      {/* Returns Tab */}
      {tab === 'returns' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Return Rate',     value: `${returnRate}%`,          color: '#EF4444' },
              { label: 'Orders Returned', value: returnedOrders.length,     color: '#1C1C1C' },
              { label: 'Revenue Lost',    value: pkr(returnedRev),          color: '#EF4444' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Return Reasons</h3>
            {returnReasonData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={returnReasonData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>
                No returns in this period.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
