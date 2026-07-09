'use client'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import Link from 'next/link'
import type { Order, OrderItem, Product } from '@/types'
import { rankTrending } from '@/lib/merchandising'
import { getEffectiveStock } from '@/lib/stock'
import { useAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { getAdminStatusColors } from '@/lib/adminColors'

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

export default function DashboardCharts({ orders, products, activeSales = [], codEnabled = false }: {
  orders: Order[]; products: Product[]; activeSales?: ActiveSaleSummary[]; codEnabled?: boolean
}) {
  const isDark = useAdminDarkMode()
  const C = getAdminStatusColors(isDark)
  const STATUS_COLORS: Record<string, string> = {
    new: C.info, processing: C.warning, shipped: C.violet,
    delivered: C.success, returned: C.critical, cancelled: '#9CA3AF',
  }
  // #1C1C1C ("today" bar) fails contrast against the dark chart surface
  // (1.08:1, per dataviz validator) — validated substitute for dark mode.
  const todayBarFill = isDark ? '#E8DDD4' : '#1C1C1C'
  // Action-card backgrounds were hardcoded light-only pastels — two solid
  // light boxes on the dark surface regardless of theme. Tinted via
  // color-mix over the theme surface/border tokens instead.
  const newOrdersBg = isDark ? `color-mix(in srgb, ${C.info} 15%, var(--admin-surface))` : '#EFF6FF'
  const newOrdersBorder = isDark ? `color-mix(in srgb, ${C.info} 35%, var(--admin-border))` : '#BFDBFE'
  const pendingBg = isDark ? `color-mix(in srgb, ${C.violet} 15%, var(--admin-surface))` : '#F5F3FF'
  const pendingBorder = isDark ? `color-mix(in srgb, ${C.violet} 35%, var(--admin-border))` : '#DDD6FE'
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
  const dashStock = getEffectiveStock
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

  // Order status donut — non-archived orders from the last 30 days
  const statusCounts: Record<string, number> = {
    new: 0, processing: 0, shipped: 0, delivered: 0, returned: 0, cancelled: 0,
  }
  orders.filter(o => !o.is_archived && isWithinDays(o.created_at, 30)).forEach(o => {
    if (statusCounts[o.order_status] !== undefined) statusCounts[o.order_status]++
  })
  const statusData = Object.entries(statusCounts)
    .map(([name, value]) => ({ name, value }))
    .filter(s => s.value > 0)

  // Same qualification + ranking as every other page (single source of
  // truth — specs/003-merchandising-badges-v2): category-relative,
  // fully automatic — the manual is_trending flag is retired (US6) and no
  // longer read here.
  const trendingProducts = rankTrending(products)
    .map(p => ({
      name: p.name,
      shortName: p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name,
      score: p.trending_score,
      chartScore: p.trending_score,
      price: p.price,
      category: p.product_category || 'Uncategorized',
      stock: dashStock(p),
      total_sold: p.total_sold,
    }))

  // Top Products by actual sales (all-time, from active orders) — ranked by
  // revenue actually earned, not by the trending/best-seller scoring
  // algorithm (that's what "Trending Now" already shows, alongside this).
  const productSalesMap: Record<string, { revenue: number; units: number }> = {}
  orders
    .filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')
    .forEach(o => {
      ;(o.items as OrderItem[]).forEach(i => {
        if (!productSalesMap[i.product_name]) productSalesMap[i.product_name] = { revenue: 0, units: 0 }
        productSalesMap[i.product_name].revenue += i.price * i.quantity
        productSalesMap[i.product_name].units += i.quantity
      })
    })
  const topProductsBySales = Object.entries(productSalesMap)
    .map(([name, d]) => ({
      name,
      shortName: name.length > 16 ? name.slice(0, 15) + '…' : name,
      revenue: d.revenue,
      units: d.units,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // Product stock helpers
  const totalProducts = products.length
  const totalStock = products.reduce((sum, p) => sum + getEffectiveStock(p), 0)

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
  const soldOutCount    = products.filter(p => getEffectiveStock(p) === 0).length
  // Match the products page filter: any variant with ≤3 units (or total stock ≤3 for non-variant products)
  const lastChanceCount = products.filter(p => {
    const vs = p.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).some(sizes =>
        Object.values(sizes as Record<string, number>).some(q => q > 0 && q <= 3)
      )
    }
    const s = getEffectiveStock(p)
    return s > 0 && s <= 3
  }).length
  const inStockCount    = products.filter(p => getEffectiveStock(p) > 0).length


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
          style={{ backgroundColor: newOrdersBg, borderLeftColor: C.info, border: `1px solid ${newOrdersBorder}`, borderLeft: `4px solid ${C.info}` }}>
          <p className="text-3xl font-bold" style={{ color: C.infoStrong }}>{newOrders}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: C.infoStrong }}>New Orders</p>
          <p className="text-xs mt-0.5" style={{ color: C.info }}>
            All unprocessed orders · tap to manage
          </p>
          {overdueNewOrders > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: C.criticalStrong }}>
              ⚠ {overdueNewOrders} order{overdueNewOrders > 1 ? 's' : ''} waiting over 24h
            </p>
          )}
        </Link>
        <Link href="/admin/orders" className="block rounded-lg p-5 border-l-4 transition-opacity hover:opacity-90"
          style={{ backgroundColor: pendingBg, border: `1px solid ${pendingBorder}`, borderLeft: `4px solid ${C.violet}` }}>
          <p className="text-3xl font-bold" style={{ color: C.violetStrong }}>{pendingShipment}</p>
          <p className="text-sm font-semibold mt-1" style={{ color: C.violetStrong }}>Pending Shipment</p>
          <p className="text-xs mt-0.5" style={{ color: C.violet }}>processing + shipped · tap to manage</p>
        </Link>
      </div>

      {/* Revenue KPIs */}
      <div>
        <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#B0A090', letterSpacing: '0.08em' }}>Revenue</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
            <p className="text-2xl font-bold">{pkr(grossRevenue7d)}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-subtle)' }}>Net: {pkr(netRevenue7d)}</p>
            {revenue7dChangePct !== null && (
              <p className="text-xs mt-0.5 font-medium" style={{ color: revenue7dChangePct >= 0 ? C.success : C.critical }}>
                {revenue7dChangePct >= 0 ? '↑' : '↓'} {Math.abs(revenue7dChangePct)}% vs prev 7d
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Gross Revenue (7d)</p>
          </div>

          <div className="rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
            <p className="text-2xl font-bold">{pkr(revenueThisMonth)}</p>
            {revenueLastMonth > 0 ? (
              <p className="text-xs mt-0.5 font-medium" style={{ color: revenueThisMonth >= revenueLastMonth ? C.success : C.critical }}>
                {revenueThisMonth >= revenueLastMonth ? '↑' : '↓'} vs last month: {pkr(revenueLastMonth)}
              </p>
            ) : (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-subtle)' }}>first month on record</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Revenue This Month</p>
          </div>

          <div className="rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
            <p className="text-2xl font-bold">{pkr(thisYearRevenue)}</p>
            {yoyChangePct !== null && (
              <p className="text-xs mt-0.5 font-medium" style={{ color: yoyChangePct >= 0 ? C.success : C.critical }}>
                {yoyChangePct >= 0 ? '↑' : '↓'} {Math.abs(yoyChangePct)}% vs {currentYear - 1}
              </p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Revenue This Year</p>
          </div>

          <div className="rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-surface)' }}>
            <p className="text-2xl font-bold">{pkr(aov)}</p>
            {aovLastMonth > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-subtle)' }}>vs last month: {pkr(aovLastMonth)}</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-subtle)' }}>Avg. Order Value</p>
          </div>
        </div>
      </div>

      {/* Operations KPIs */}
      <div>
        <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#B0A090', letterSpacing: '0.08em' }}>Operations</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
            <p className="text-2xl font-bold">{ordersThisMonth}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: fulfillmentRate >= 50 ? C.success : C.warning }}>
              {fulfillmentRate}% fulfilled
            </p>
            {ordersLastMonth > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--admin-subtle)' }}>vs last month: {ordersLastMonth} orders</p>
            )}
            <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Orders This Month</p>
          </div>

          <Link href="/admin/products?filter=low-stock"
            className="bg-[var(--admin-surface)] rounded-lg p-5 border block hover:shadow-sm transition-shadow"
            style={{ borderColor: lowStockItems.length > 0 ? (isDark ? `color-mix(in srgb, ${C.criticalStrong} 45%, var(--admin-border))` : '#FCA5A5') : 'var(--admin-border)' }}>
            <p className="text-2xl font-bold" style={{ color: lowStockItems.length > 0 ? C.criticalStrong : 'var(--admin-text)' }}>
              {lowStockItems.length}
            </p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-subtle)' }}>variants need restocking</p>
            <p className="text-xs mt-1" style={{ color: '#A68B6E' }}>Low Stock Alerts → view</p>
          </Link>

          <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
            <p className="text-2xl font-bold">{totalProducts}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: C.warning }}>
              {totalStock.toLocaleString('en-US')} units in stock
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Total Products</p>
          </div>

          <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
            <p className="text-2xl font-bold">{repeatCustomerRate}%</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-subtle)' }}>
              {repeatCustomerCount} of {uniqueCustomerCount} customers
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>Repeat Rate</p>
          </div>

          {codEnabled && codSuccessRate !== null && (
            <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
              <p className="text-2xl font-bold"
                style={{ color: codSuccessRate >= 65 ? C.success : codSuccessRate >= 50 ? C.warning : C.critical }}>
                {codSuccessRate}%
              </p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--admin-subtle)' }}>
                {codDelivered} of {resolvedCod.length} resolved COD orders
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>COD Success Rate</p>
            </div>
          )}
        </div>
      </div>

      {/* Cash Position (MTD) */}
      {codEnabled && (cashCollectedMTD > 0 || inTransitMTD > 0) && (
        <div className="flex gap-4 px-5 py-3 rounded-lg border" style={{ borderColor: 'var(--admin-border)', backgroundColor: 'var(--admin-bg)' }}>
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--admin-muted)' }}>Cash Collected (MTD)</p>
            <p className="text-sm font-semibold mt-0.5">{pkr(cashCollectedMTD)}</p>
          </div>
          <div className="w-px" style={{ backgroundColor: 'var(--admin-border)' }} />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'var(--admin-muted)' }}>COD In Transit</p>
            <p className="text-sm font-semibold mt-0.5" style={{ color: inTransitMTD > 0 ? C.warning : '#9CA3AF' }}>
              {pkr(inTransitMTD)}
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Order Status Donut */}
        <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
          <h3 className="font-semibold mb-4">Order Status Breakdown <span className="font-normal text-xs" style={{ color: 'var(--admin-subtle)' }}>(Last 30 Days)</span></h3>
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
                    <span style={{ color: 'var(--admin-text-secondary)' }}>{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--admin-subtle)' }}>No orders yet.</p>
          )}
        </div>

        {/* Sales Trend — last 7 days */}
        <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
          <h3 className="font-semibold mb-1">Sales Trend</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--admin-subtle)' }}>Revenue per day — last 7 days</p>
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
                  <Cell key={i} fill={entry.isToday ? todayBarFill : entry.revenue > 0 ? '#A68B6E' : 'var(--admin-divider)'} />
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
            { label: 'Last Chance',    value: lastChanceCount, color: C.warning, href: '/admin/products?filter=low-stock',    sub: '1–3 units remaining',                                                       linkLabel: '→ View products' },
            { label: 'Sold Out',       value: soldOutCount,    color: C.critical, href: '/admin/products?filter=sold-out',     sub: null,                                                                        linkLabel: '→ View products' },
            { label: 'Slow Movers',    value: slowMoverCount,  color: slowMoverCount > 0 ? C.criticalStrong : 'var(--admin-text)', href: '/admin/products?filter=slow-movers', sub: slowMoverCount > 0 ? 'below store avg sell-through' : 'All moving well', linkLabel: '→ View products' },
            { label: 'Returns (last 7d)',   value: returned7d,  color: C.criticalStrong, href: '/admin/orders',                      sub: null,                                                                        linkLabel: '→ View orders' },
            { label: 'Cancelled (last 7d)', value: cancelled7d, color: 'var(--admin-muted)', href: '/admin/orders',                      sub: null,                                                                        linkLabel: '→ View orders' },
          ].map(({ label, value, color, href, sub, linkLabel }) => {
            const inner = (
              <>
                <p className="text-2xl font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--admin-muted)' }}>{label}</p>
                {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--admin-subtle)' }}>{sub}</p>}
                {href && <p className="text-xs mt-0.5" style={{ color: '#A68B6E' }}>{linkLabel}</p>}
              </>
            )
            return href ? (
              <Link key={label} href={href}
                className="bg-[var(--admin-surface)] rounded-lg p-4 border text-center block hover:shadow-sm transition-shadow"
                style={{ borderColor: 'var(--admin-border)' }}>
                {inner}
              </Link>
            ) : (
              <div key={label} className="bg-[var(--admin-surface)] rounded-lg p-4 border text-center" style={{ borderColor: 'var(--admin-border)' }}>
                {inner}
              </div>
            )
          })}
        </div>
      </div>


      {/* Merchandise — Trending Now + Top Products by Sales (spec 006 follow-up:
          Top Colors moved to Analytics > Merchandising tab) */}
      {(trendingProducts.length > 0 || topProductsBySales.length > 0) && (
        <div>
          <h3 className="font-semibold mb-3">Merchandise</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trendingProducts.length > 0 && (
              <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="flex items-baseline justify-between mb-4">
                  <p className="font-semibold text-sm">↑ Trending Now</p>
                  <span className="text-xs" style={{ color: 'var(--admin-subtle)' }}>by score</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(160, trendingProducts.length * 38)}>
                  <BarChart data={trendingProducts} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} tickFormatter={(v: number) => v.toFixed(1)} />
                    <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as typeof trendingProducts[0]
                        return (
                          <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-[var(--admin-surface)] space-y-0.5" style={{ borderColor: 'var(--admin-border)' }}>
                            <p className="font-semibold mb-1">{d.name}</p>
                            <p style={{ color: 'var(--admin-subtle)' }}>{d.category}</p>
                            <p style={{ color: '#A68B6E' }}>PKR {Number(d.price).toLocaleString()}</p>
                            <p style={{ color: 'var(--admin-muted)' }}>{d.total_sold} units sold · score {d.score.toFixed(1)}</p>
                            <p style={{ color: d.stock === 0 ? C.criticalStrong : d.stock <= 5 ? '#B45309' : '#166534' }}>
                              {d.stock === 0 ? '⚠ OUT OF STOCK — restock urgently' : d.stock <= 5 ? `⚠ Only ${d.stock} left — restock soon` : `${d.stock} in stock`}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="chartScore" radius={[0, 4, 4, 0]} name="Trend Score">
                      {trendingProducts.map((entry, i) => (
                        <Cell key={i} fill={entry.stock === 0 ? C.criticalStrong : entry.stock <= 5 ? C.warning : '#BE185D'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {topProductsBySales.length > 0 && (
              <div className="bg-[var(--admin-surface)] rounded-lg p-5 border" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="flex items-baseline justify-between mb-4">
                  <p className="font-semibold text-sm">Top Products</p>
                  <span className="text-xs" style={{ color: 'var(--admin-subtle)' }}>by revenue</span>
                </div>
                <ResponsiveContainer width="100%" height={Math.max(160, topProductsBySales.length * 38)}>
                  <BarChart data={topProductsBySales} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} />
                    <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as typeof topProductsBySales[0]
                        return (
                          <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-[var(--admin-surface)] space-y-0.5" style={{ borderColor: 'var(--admin-border)' }}>
                            <p className="font-semibold mb-1">{d.name}</p>
                            <p style={{ color: '#A68B6E' }}>PKR {d.revenue.toLocaleString()}</p>
                            <p style={{ color: 'var(--admin-muted)' }}>{d.units} units sold</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} fill="#A68B6E" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
