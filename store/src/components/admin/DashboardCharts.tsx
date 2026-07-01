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

type ActiveSaleSummary = {
  id: string; title: string; revenue: number; orders: number
  todayRevenue: number; yesterdayRevenue: number
}

export default function DashboardCharts({ orders, products, activeSales = [] }: {
  orders: Order[]; products: Product[]; activeSales?: ActiveSaleSummary[]
}) {
  const thisMonth = orders.filter(o => isThisMonth(o.created_at))
  const last7days = orders.filter(o => isWithinDays(o.created_at, 7))

  // Last month comparison
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = orders.filter(o => {
    const d = new Date(o.created_at)
    return d >= lastMonthStart && d < lastMonthEnd &&
      o.order_status !== 'cancelled' && o.order_status !== 'returned'
  })
  const revenueLastMonth = lastMonth.reduce((s, o) => s + o.total, 0)
  const ordersLastMonth  = lastMonth.length
  const aovLastMonth     = ordersLastMonth > 0 ? Math.round(revenueLastMonth / ordersLastMonth) : 0

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
  const ordersThisMonth   = thisMonth.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned').length
  const deliveredThisMonth = thisMonth.filter(o => o.order_status === 'delivered').length

  // Fix #5 — AOV
  const aov = ordersThisMonth > 0 ? Math.round(revenueThisMonth / ordersThisMonth) : 0

  // fulfillment rate
  const fulfillmentRate = ordersThisMonth > 0
    ? Math.round((deliveredThisMonth / ordersThisMonth) * 100)
    : 0

  // 7-day cancellations & returns — action date when populated, creation date before migration
  const cancelled7d = orders.filter(o =>
    o.order_status === 'cancelled' && isWithinDays(o.cancelled_at ?? o.created_at, 7)
  ).length
  const returned7d = orders.filter(o =>
    o.order_status === 'returned' && isWithinDays(o.returned_at ?? o.created_at, 7)
  ).length

  // COD Success Rate (resolved COD orders only — excludes in-transit)
  const resolvedCod = orders.filter(o =>
    o.payment_method === 'cod' &&
    (o.order_status === 'delivered' || o.order_status === 'returned' || o.order_status === 'cancelled')
  )
  const codDelivered   = resolvedCod.filter(o => o.order_status === 'delivered').length
  const codSuccessRate = resolvedCod.length > 0
    ? Math.round((codDelivered / resolvedCod.length) * 100)
    : null

  // Cash Collected vs Booked Revenue (MTD)
  const cashCollectedMTD = thisMonth.filter(o =>
    o.order_status !== 'cancelled' && o.order_status !== 'returned' &&
    (o.payment_method === 'cod'
      ? o.order_status === 'delivered'
      : o.payment_status === 'paid')
  ).reduce((s, o) => s + o.total, 0)
  const inTransitMTD = revenueThisMonth - cashCollectedMTD

  // Previous 7d for comparison
  const prev7dStart = new Date(Date.now() - 14 * 86400000)
  const prev7dEnd   = new Date(Date.now() - 7  * 86400000)
  const prevNet7d   = orders
    .filter(o => {
      const d = new Date(o.created_at)
      return d >= prev7dStart && d < prev7dEnd &&
        o.order_status !== 'cancelled' && o.order_status !== 'returned'
    })
    .reduce((s, o) => s + o.total, 0)
  const revenue7dChangePct = prevNet7d > 0
    ? Math.round(((netRevenue7d - prevNet7d) / prevNet7d) * 100)
    : null

  // Year-over-Year revenue
  const currentYear = new Date().getFullYear()
  const thisYearRevenue = orders
    .filter(o => new Date(o.created_at).getFullYear() === currentYear &&
      o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .reduce((s, o) => s + o.total, 0)
  const lastYearRevenue = orders
    .filter(o => new Date(o.created_at).getFullYear() === currentYear - 1 &&
      o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .reduce((s, o) => s + o.total, 0)
  const yoyChangePct = lastYearRevenue > 0
    ? Math.round(((thisYearRevenue - lastYearRevenue) / lastYearRevenue) * 100)
    : null

  // Repeat customer rate (all-time, non-cancelled/returned)
  const activeOrdersAllTime = orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
  const phoneCountMap: Record<string, number> = {}
  activeOrdersAllTime.forEach(o => {
    phoneCountMap[o.customer_phone] = (phoneCountMap[o.customer_phone] || 0) + 1
  })
  const uniqueCustomerCount = Object.keys(phoneCountMap).length
  const repeatCustomerCount = Object.values(phoneCountMap).filter(c => c > 1).length
  const repeatCustomerRate = uniqueCustomerCount > 0
    ? Math.round((repeatCustomerCount / uniqueCustomerCount) * 100)
    : 0

  // Slow movers — relative: below 50% of store average sell-through, 15+ days old
  function dashStock(p: Product): number {
    const vs = p.variant_stock
    return vs && Object.keys(vs).length > 0
      ? Object.values(vs).reduce((sum, sizes) =>
          sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0)
      : p.stock_quantity
  }
  const eligibleProds = products.filter(p => {
    const age = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return age >= 15 && dashStock(p) > 0
  })
  const dashAvgSellThrough = eligibleProds.length > 0
    ? eligibleProds.reduce((sum, p) => {
        const s = dashStock(p)
        return sum + p.total_sold / (p.total_sold + s)
      }, 0) / eligibleProds.length
    : 0
  const slowMoverCount = eligibleProds.filter(p => {
    if (dashAvgSellThrough === 0) return false
    const s = dashStock(p)
    return (p.total_sold / (p.total_sold + s)) < dashAvgSellThrough * 0.5
  }).length

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

  // 7-day sales trend
  const salesTrend7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr = d.toISOString().slice(0, 10)
    const label   = i === 6 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' })
    const dayOrders = orders.filter(o =>
      o.created_at.startsWith(dateStr) &&
      o.order_status !== 'cancelled' &&
      o.order_status !== 'returned'
    )
    return {
      label,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders:  dayOrders.length,
      isToday: i === 6,
    }
  })

  // Low stock list
  const lowStockItems: { name: string; variant: string; qty: number }[] = []
  products.forEach(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) => {
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty > 0 && qty <= 3) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      })
    } else if (p.stock_quantity > 0 && p.stock_quantity <= 3) {
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
  // Match the products page filter: any variant with ≤3 units (or total stock ≤3 for non-variant products)
  const lastChanceCount = products.filter(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).some(sizes =>
        Object.values(sizes as Record<string, number>).some(q => q > 0 && q <= 3)
      )
    }
    const s = getProductStock(p)
    return s > 0 && s <= 3
  }).length
  const inStockCount    = products.filter(p => getProductStock(p) > 0).length


  // Sale banner logic
  const totalSaleRevenue = activeSales.reduce((s, a) => s + a.revenue, 0)
  const totalSaleOrders  = activeSales.reduce((s, a) => s + a.orders, 0)
  const todayTotal       = activeSales.reduce((s, a) => s + a.todayRevenue, 0)
  const yesterdayTotal   = activeSales.reduce((s, a) => s + a.yesterdayRevenue, 0)
  const growthPct = yesterdayTotal > 0
    ? Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 100)
    : todayTotal > 0 ? 100 : null

  return (
    <div className="space-y-6">

      {/* Active sale banner */}
      {activeSales.length > 0 && (
        <Link
          href={activeSales.length === 1 ? `/admin/sales/${activeSales[0].id}/analytics` : '/admin/sales'}
          className="flex items-center justify-between px-5 py-4 rounded-lg transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #3A2F2A 100%)', color: 'white', textDecoration: 'none' }}>
          <div>
            <p className="text-sm font-semibold mb-0.5" style={{ color: '#E8DDD4' }}>
              {activeSales.length === 1
                ? `${activeSales[0].title} is live`
                : `${activeSales.length} sales running`}
            </p>
            <p className="text-xs" style={{ color: '#A68B6E' }}>
              {totalSaleOrders > 0
                ? `${pkr(totalSaleRevenue)} · ${totalSaleOrders} order${totalSaleOrders !== 1 ? 's' : ''}${growthPct !== null ? ` · today ${growthPct >= 0 ? '↑' : '↓'} ${Math.abs(growthPct)}% vs yesterday` : ''}`
                : 'No orders yet — sale is live, waiting for first order'}
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full shrink-0"
            style={{ backgroundColor: '#A68B6E', color: 'white' }}>
            {activeSales.length === 1 ? 'View Analytics →' : 'View All →'}
          </span>
        </Link>
      )}

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
        {/* Gross Revenue 7d with net sub + vs prev */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(grossRevenue7d)}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>
            Net: {pkr(netRevenue7d)}
          </p>
          {revenue7dChangePct !== null && (
            <p className="text-xs mt-0.5 font-medium"
              style={{ color: revenue7dChangePct >= 0 ? '#10B981' : '#EF4444' }}>
              {revenue7dChangePct >= 0 ? '↑' : '↓'} {Math.abs(revenue7dChangePct)}% vs prev 7d
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">Gross Revenue (7d)</p>
        </div>

        {/* Revenue This Month */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(revenueThisMonth)}</p>
          {revenueLastMonth > 0 ? (
            <p className="text-xs mt-0.5 font-medium"
              style={{ color: revenueThisMonth >= revenueLastMonth ? '#10B981' : '#EF4444' }}>
              {revenueThisMonth >= revenueLastMonth ? '↑' : '↓'} vs last month: {pkr(revenueLastMonth)}
            </p>
          ) : (
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>first month on record</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Revenue This Month</p>
        </div>

        {/* Orders This Month + fulfillment rate */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{ordersThisMonth}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: fulfillmentRate >= 50 ? '#10B981' : '#F59E0B' }}>
            {fulfillmentRate}% fulfilled
          </p>
          {ordersLastMonth > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>vs last month: {ordersLastMonth} orders</p>
          )}
          <p className="text-xs text-gray-500 mt-1">Orders This Month</p>
        </div>

        {/* AOV */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(aov)}</p>
          {aovLastMonth > 0 && (
            <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>vs last month: {pkr(aovLastMonth)}</p>
          )}
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

        {/* Revenue This Year with YoY */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{pkr(thisYearRevenue)}</p>
          {yoyChangePct !== null && (
            <p className="text-xs mt-0.5 font-medium"
              style={{ color: yoyChangePct >= 0 ? '#10B981' : '#EF4444' }}>
              {yoyChangePct >= 0 ? '↑' : '↓'} {Math.abs(yoyChangePct)}% vs {currentYear - 1}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">Revenue This Year</p>
        </div>

        {/* Repeat Customer Rate */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-2xl font-bold">{repeatCustomerRate}%</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>
            {repeatCustomerCount} of {uniqueCustomerCount} customers
          </p>
          <p className="text-xs text-gray-500 mt-1">Repeat Rate</p>
        </div>

        {/* COD Success Rate */}
        {codSuccessRate !== null && (
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-2xl font-bold"
              style={{ color: codSuccessRate >= 65 ? '#10B981' : codSuccessRate >= 50 ? '#F59E0B' : '#EF4444' }}>
              {codSuccessRate}%
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#9CA3AF' }}>
              {codDelivered} of {resolvedCod.length} resolved COD orders
            </p>
            <p className="text-xs text-gray-500 mt-1">COD Success Rate</p>
          </div>
        )}
      </div>

      {/* Cash Position (MTD) */}
      {(cashCollectedMTD > 0 || inTransitMTD > 0) && (
        <div className="flex gap-4 px-5 py-3 rounded-lg border" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAFAFA' }}>
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: '#6B7280' }}>Cash Collected (MTD)</p>
            <p className="text-sm font-semibold mt-0.5">{pkr(cashCollectedMTD)}</p>
          </div>
          <div className="w-px" style={{ backgroundColor: '#E8DDD4' }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: '#6B7280' }}>COD In Transit</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: inTransitMTD > 0 ? '#F59E0B' : '#9CA3AF' }}>
              {pkr(inTransitMTD)}
            </p>
          </div>
        </div>
      )}

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

        {/* Sales Trend — last 7 days */}
        <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
          <h3 className="font-semibold mb-1">Sales Trend</h3>
          <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>Revenue per day — last 7 days</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesTrend7d} margin={{ left: 0, right: 8 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} width={38}
                tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
              <Tooltip
                formatter={(v) => [`PKR ${Number(v).toLocaleString()}`, 'Revenue']}
                labelFormatter={(l) => String(l)}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue">
                {salesTrend7d.map((entry, i) => (
                  <Cell key={i} fill={entry.isToday ? '#1C1C1C' : entry.revenue > 0 ? '#A68B6E' : '#E8DDD4'} />
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
            { label: 'Last Chance',    value: lastChanceCount, color: '#F59E0B', href: '/admin/products?filter=low-stock',    sub: '1–3 units remaining',                                                       linkLabel: '→ View products' },
            { label: 'Sold Out',       value: soldOutCount,    color: '#EF4444', href: '/admin/products?filter=sold-out',     sub: null,                                                                        linkLabel: '→ View products' },
            { label: 'Slow Movers',    value: slowMoverCount,  color: slowMoverCount > 0 ? '#DC2626' : '#374151', href: '/admin/products?filter=slow-movers', sub: slowMoverCount > 0 ? 'below store avg sell-through' : 'All moving well', linkLabel: '→ View products' },
            { label: 'Returns (last 7d)',   value: returned7d,  color: '#DC2626', href: '/admin/orders',                      sub: null,                                                                        linkLabel: '→ View orders' },
            { label: 'Cancelled (last 7d)', value: cancelled7d, color: '#6B7280', href: '/admin/orders',                      sub: null,                                                                        linkLabel: '→ View orders' },
          ].map(({ label, value, color, href, sub, linkLabel }) => {
            const inner = (
              <>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: '#6B7280' }}>{label}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{sub}</p>}
                {href && <p className="text-xs mt-0.5" style={{ color: '#A68B6E' }}>{linkLabel}</p>}
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


    </div>
  )
}
