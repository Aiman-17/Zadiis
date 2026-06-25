'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import type { Order, OrderItem, Product } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  new:        '#3B82F6',
  processing: '#F59E0B',
  shipped:    '#8B5CF6',
  delivered:  '#10B981',
  returned:   '#EF4444',
  cancelled:  '#9CA3AF',
}

function pkr(n: number) { return `PKR ${Number(n).toLocaleString('en-US')}` }

function isWithinDays(dateStr: string, days: number) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(dateStr) >= cutoff
}

function isThisMonth(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
}

export default function DashboardCharts({ orders, products }: { orders: Order[]; products: Product[] }) {
  const thisMonth = orders.filter(o => isThisMonth(o.created_at))
  const last7days = orders.filter(o => isWithinDays(o.created_at, 7))

  // Fix #2 — Action cards match orders page counts (all-time, not 7-day)
  const newOrders       = orders.filter(o => !o.is_archived && o.order_status === 'new').length
  const pendingShipment = orders.filter(o => !o.is_archived && (o.order_status === 'processing' || o.order_status === 'shipped')).length

  // Fix #2 — overdue new orders (placed > 24h ago, still unprocessed)
  const overdueNewOrders = orders.filter(o =>
    !o.is_archived && o.order_status === 'new' && !isWithinDays(o.created_at, 1)
  ).length

  // Fix #1 — show gross AND net revenue separately
  const grossRevenue7d  = last7days.reduce((s, o) => s + o.total, 0)
  const netRevenue7d    = last7days
    .filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .reduce((s, o) => s + o.total, 0)

  const revenueThisMonth  = thisMonth
    .filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .reduce((s, o) => s + o.total, 0)
  const ordersThisMonth   = thisMonth.filter(o => o.order_status !== 'cancelled').length
  const deliveredThisMonth = thisMonth.filter(o => o.order_status === 'delivered').length

  // Fix #5 — AOV
  const aov = ordersThisMonth > 0 ? Math.round(revenueThisMonth / ordersThisMonth) : 0

  // fulfillment rate
  const fulfillmentRate = ordersThisMonth > 0
    ? Math.round((deliveredThisMonth / ordersThisMonth) * 100)
    : 0

  // 7-day cancellations & returns
  const cancelled7d = last7days.filter(o => o.order_status === 'cancelled').length
  const returned7d  = last7days.filter(o => o.order_status === 'returned').length

  // Order status donut — ALL non-archived orders
  const statusCounts: Record<string, number> = {
    new: 0, processing: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0,
  }
  orders.filter(o => !o.is_archived).forEach(o => {
    if (statusCounts[o.order_status] !== undefined) statusCounts[o.order_status]++
  })
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(s => s.value > 0)

  // Product stock helpers
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return sum + Object.values(vs).reduce((s, sizes) =>
        s + Object.values(sizes as Record<string, number>).reduce((si, q) => si + q, 0), 0)
    }
    return sum + p.stock_quantity
  }, 0)

  // Monthly sales trend — last 12 months
  const monthlySalesTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (11 - i))
    const year  = d.getFullYear()
    const month = d.getMonth()
    const label = month === 0
      ? `Jan '${String(year).slice(2)}`
      : d.toLocaleString('default', { month: 'short' })
    const mo = orders.filter(o => {
      const od = new Date(o.created_at)
      return od.getFullYear() === year && od.getMonth() === month &&
        o.order_status !== 'cancelled' && o.order_status !== 'returned'
    })
    return { label, revenue: mo.reduce((s, o) => s + o.total, 0), orders: mo.length }
  })

  // Low stock list
  const lowStockItems: { name: string; variant: string; qty: number }[] = []
  products.forEach(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) => {
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty <= 3) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      })
    } else if (p.stock_quantity <= 3) {
      lowStockItems.push({ name: p.name, variant: 'All sizes', qty: p.stock_quantity })
    }
  })
  lowStockItems.sort((a, b) => a.qty - b.qty)

  // Inventory health
  function getProductStock(p: Product): number {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).reduce(
        (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
      )
    }
    return p.stock_quantity
  }
  const soldOutCount    = products.filter(p => getProductStock(p) === 0).length
  const lastChanceCount = products.filter(p => { const s = getProductStock(p); return s > 0 && s <= 3 }).length
  const inStockCount    = products.filter(p => getProductStock(p) > 0).length

  // Fix #6 — Best Sellers: ALL products ranked, not just score > 0
  const topBestSellers = [...products]
    .sort((a, b) => b.best_seller_score - a.best_seller_score)
    .slice(0, 5)
  const topTrending = [...products]
    .filter(p => p.trending_score > 0)
    .sort((a, b) => b.trending_score - a.trending_score)
    .slice(0, 5)
  const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const justDropped = [...products]
    .filter(p => new Date(p.created_at) >= d7)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/orders" className="block rounded-lg p-5 border-l-4 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#EFF6FF', borderLeftColor: '#3B82F6', border: '1px solid #BFDBFE', borderLeft: '4px solid #3B82F6' }}>
          <p className="text-3xl font-bold" style={{ color: '#1D4ED8' }}>{newOrders}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#1D4ED8' }}>New Orders</p>
          <p className="text-xs mt-0.5" style={{ color: '#3B82F6' }}>
            All unprocessed orders · tap to manage
          </p>
          {overdueNewOrders > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: '#DC2626' }}>
              ⚠ {overdueNewOrders} order{overdueNewOrders > 1 ? 's' : ''} waiting over 24h
            </p>
          )}
        </Link>
        <Link href="/admin/orders" className="block rounded-lg p-5 border-l-4 transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE', borderLeft: '4px solid #7C3AED' }}>
          <p className="text-3xl font-bold" style={{ color: '#5B21B6' }}>{pendingShipment}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: '#5B21B6' }}>Pending Shipment</p>
          <p className="text-xs mt-0.5" style={{ color: '#7C3AED' }}>processing + shipped · tap to manage</p>
        </Link>
      </div>

      {/* Fix #1 #3 #5 #7 #8 — KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Gross Revenue 7d with net sub */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(grossRevenue7d)}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>
            Net: {pkr(netRevenue7d)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Gross Revenue (7d)</p>
        </div>

        {/* Revenue This Month */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(revenueThisMonth)}</p>
          <p className="text-xs text-gray-500 mt-1">Revenue This Month</p>
        </div>

        {/* Orders This Month + fulfillment rate */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{ordersThisMonth}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: fulfillmentRate >= 50 ? '#10B981' : '#F59E0B' }}>
            {fulfillmentRate}% fulfilled
          </p>
          <p className="text-xs text-gray-500 mt-1">Orders This Month</p>
        </div>

        {/* AOV */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(aov)}</p>
          <p className="text-xs text-gray-500 mt-1">Avg. Order Value</p>
        </div>

        {/* Low Stock Variants — links to filtered products */}
        <Link href="/admin/products?filter=low-stock"
          className="bg-white rounded-lg p-5 border block hover:shadow-sm transition-shadow"
          style={{ borderColor: lowStockItems.length > 0 ? '#FCA5A5' : '#E8DDD4' }}>
          <p className="text-2xl font-bold" style={{ color: lowStockItems.length > 0 ? '#DC2626' : '#374151' }}>
            {lowStockItems.length}
          </p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>
            variants need restocking
          </p>
          <p className="text-xs mt-1" style={{ color: '#A68B6E' }}>Low Stock Alerts → view</p>
        </Link>

        {/* Total Products */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{totalProducts}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#F59E0B' }}>
            {totalStock.toLocaleString('en-US')} units in stock
          </p>
          <p className="text-xs text-gray-500 mt-1">Total Products</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Status Donut */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-4">Order Status Breakdown</h3>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name"
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                    {statusData.map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.name] ?? '#A68B6E'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {statusData.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: STATUS_COLORS[s.name] }} />
                    <span style={{ color: '#4B5563' }}>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No orders yet.</p>
          )}
        </div>

        {/* Sales Trend — 12 months */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-1">Sales Trend</h3>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>Revenue per month — last 12 months</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySalesTrend} margin={{ left: 0, right: 8 }}>
              <XAxis dataKey="label" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={38}
                tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
              <Tooltip
                formatter={(v: number) => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']}
                labelFormatter={(l) => String(l)}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue">
                {monthlySalesTrend.map((entry, i) => (
                  <Cell key={i}
                    fill={i === 11 ? '#1C1C1C' : entry.revenue > 0 ? '#A68B6E' : '#E8DDD4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Inventory Health */}
      <div>
        <h3 className="font-semibold mb-3">Inventory Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Active Products', value: totalProducts,   color: '#374151', href: null,            sub: null },
            { label: 'In Stock',        value: inStockCount,    color: '#10B981', href: null,            sub: null },
            { label: 'Last Chance',     value: lastChanceCount, color: '#F59E0B', href: null,            sub: '1–3 units remaining' },
            { label: 'Sold Out',        value: soldOutCount,    color: '#EF4444', href: null,            sub: null },
            { label: 'Returns (7d)',    value: returned7d,      color: '#DC2626', href: '/admin/orders', sub: null },
            { label: 'Cancelled (7d)', value: cancelled7d,     color: '#6B7280', href: '/admin/orders', sub: null },
          ].map(({ label, value, color, href, sub }) => {
            const inner = (
              <>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{label}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
                {href && <p className="text-xs mt-0.5" style={{ color: '#A68B6E' }}>→ View orders</p>}
              </>
            )
            return href ? (
              <Link key={label} href={href}
                className="bg-white rounded-lg p-4 border text-center block hover:shadow-sm transition-shadow"
                style={{ borderColor: '#E8DDD4' }}>
                {inner}
              </Link>
            ) : (
              <div key={label} className="bg-white rounded-lg p-4 border text-center" style={{ borderColor: '#E8DDD4' }}>
                {inner}
              </div>
            )
          })}
        </div>
      </div>

      {/* Merchandising Panel */}
      <div>
        <h3 className="font-semibold mb-3">Merchandising</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Fix #6 — Best Sellers: all products ranked */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-center gap-2 mb-4">
              <p className="font-semibold text-sm">Best Sellers</p>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>by score</span>
            </div>
            <ol className="space-y-2.5">
              {topBestSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-5 text-xs font-bold shrink-0 text-right" style={{ color: '#A68B6E' }}>#{i + 1}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs shrink-0" style={{ color: p.total_sold > 0 ? '#374151' : '#D1D5DB' }}>
                    {p.total_sold > 0 ? `${p.total_sold} sold` : 'no sales'}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {/* Trending Now */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-center gap-2 mb-4">
              <p className="font-semibold text-sm">Trending Now</p>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>this week</span>
            </div>
            {topTrending.length === 0 ? (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>No trending data yet. Products score after recent orders.</p>
            ) : (
              <ol className="space-y-2.5">
                {topTrending.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 text-xs font-bold shrink-0 text-right" style={{ color: '#C62828' }}>#{i + 1}</span>
                    <span className="flex-1 truncate">{p.name}</span>
                    <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>↑ {p.trending_score.toFixed(1)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Just Dropped */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-center gap-2 mb-4">
              <p className="font-semibold text-sm">Just Dropped</p>
              <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>last 7 days</span>
            </div>
            {justDropped.length === 0 ? (
              <p className="text-xs" style={{ color: '#9CA3AF' }}>No new products in the last 7 days.</p>
            ) : (
              <ul className="space-y-2.5">
                {justDropped.map(p => {
                  const ageDays = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86_400_000)
                  const stock   = getProductStock(p)
                  return (
                    <li key={p.id} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs shrink-0" style={{ color: '#9CA3AF' }}>
                        {ageDays === 0 ? 'today' : `${ageDays}d ago`}
                      </span>
                      {stock <= 3 && stock > 0 && (
                        <span className="text-xs font-semibold shrink-0" style={{ color: '#C62828' }}>{stock} left</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

        </div>
      </div>

      {/* Fix #4 — Low Stock Alerts badge outside h3 */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <div className="flex items-center gap-2 mb-4">
            <h3 className="font-semibold">Low Stock Alerts</h3>
            <span className="text-xs px-2 py-0.5 rounded-full font-normal"
              style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
              {lowStockItems.length}
            </span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 10).map((item, i) => (
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
        </div>
      )}

    </div>
  )
}
