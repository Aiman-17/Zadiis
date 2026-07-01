'use client'
import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
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
  changed_mind:       'Changed Mind',
  no_response:        'No Response',
  wrong_address:      'Wrong Address',
  duplicate_order:    'Duplicate',
  out_of_stock:       'Out of Stock',
  delivery_delay:     'Delivery Delay',
  delivery_too_slow:  'Delivery Too Slow',
  ordered_by_mistake: 'Ordered by Mistake',
  found_better_price: 'Found Better Price',
  other:              'Other',
}

const RETURN_REASON_LABELS: Record<string, string> = {
  wrong_size:      'Wrong Size',
  defective_item:  'Defective / Damaged',
  wrong_item_sent: 'Wrong Item Sent',
  changed_mind:    'Changed Mind',
  exchange:        'Exchange Request',
  other:           'Other',
}

type Tab = 'revenue' | 'performance' | 'products' | 'inventory' | 'orders'

function pkr(n: number) { return `PKR ${Number(n).toLocaleString()}` }

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toWeeklySundayKey(d: Date): string {
  const ws = new Date(d)
  ws.setDate(d.getDate() - d.getDay())
  return localDateKey(ws)
}

function getMerchStock(p: Product): number {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
    )
  }
  return p.stock_quantity
}

function buildAllBuckets(range: string, longMonthLabel = false) {
  const today = new Date()
  const map: Record<string, { label: string; revenue: number; orders: number; units: number }> = {}

  if (range === '12m') {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = longMonthLabel
        ? d.toLocaleString('default', { month: 'long', year: 'numeric' })
        : d.toLocaleString('default', { month: 'short', year: '2-digit' })
      map[key] = { label, revenue: 0, orders: 0, units: 0 }
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
      map[key] = { label, revenue: 0, orders: 0, units: 0 }
      cur.setDate(cur.getDate() + 7)
    }
  } else {
    const days = range === '7d' ? 7 : 30
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const key = localDateKey(d)
      map[key] = { label: '', revenue: 0, orders: 0, units: 0 }
    }
  }
  return map
}

function buildTrendData(orders: Order[], range: string) {
  const isMonthly = range === '12m'
  const isWeekly  = range === '90d'
  const map = buildAllBuckets(range, false)

  if (!isMonthly && !isWeekly) {
    Object.keys(map).forEach(key => {
      const [y, m, day] = key.split('-').map(Number)
      const d = new Date(y, m - 1, day)
      map[key].label = d.toLocaleDateString('default', { month: 'short', day: 'numeric' })
    })
  }

  orders.forEach(o => {
    if (o.order_status === 'cancelled' || o.order_status === 'returned') return
    const d = new Date(o.created_at)
    let key: string
    if (isMonthly)      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    else if (isWeekly)  key = toWeeklySundayKey(d)
    else                key = localDateKey(d)
    if (map[key]) { map[key].revenue += o.total; map[key].orders += 1 }
  })

  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)
}

function buildSalesTrendTable(orders: Order[], range: string) {
  const isMonthly = range === '12m'
  const isWeekly  = range === '90d'
  const map = buildAllBuckets(range, true)

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
    if (isMonthly)      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    else if (isWeekly)  key = toWeeklySundayKey(d)
    else                key = localDateKey(d)
    if (map[key]) {
      map[key].revenue += o.total
      map[key].orders  += 1
      map[key].units   += (o.items as OrderItem[]).reduce((s, i) => s + i.quantity, 0)
    }
  })

  const rows = Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v)

  return rows.map((row, i) => {
    const prev   = rows[i - 1]
    const growth = prev && prev.revenue > 0
      ? Math.round(((row.revenue - prev.revenue) / prev.revenue) * 100)
      : null
    const aov = row.orders > 0 ? Math.round(row.revenue / row.orders) : 0
    return { ...row, growth, aov }
  })
}

export default function AnalyticsClient({
  orders,
  products,
  range,
  allCostPrices,
}: {
  orders: Order[]
  products: Product[]
  range: string
  allCostPrices?: { id: string; cost_price: number }[]
}) {
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>((searchParams.get('tab') as Tab) || 'revenue')
  const router = useRouter()
  const pathname = usePathname()

  const setRange = (r: string) => {
    router.push(`${pathname}?range=${r}&tab=${tab}`, { scroll: false })
    router.refresh()
  }

  const activeOrders = orders.filter(o => o.order_status !== 'cancelled' && o.order_status !== 'returned')

  // ── Revenue ────────────────────────────────────────────────────────────────
  const grossRevenue    = orders.reduce((s, o) => s + o.total, 0)
  const cancelledOrders = orders.filter(o => o.order_status === 'cancelled')
  const returnedOrders  = orders.filter(o => o.order_status === 'returned')
  const cancelledRev    = cancelledOrders.reduce((s, o) => s + o.total, 0)
  const returnedRev     = returnedOrders.reduce((s, o) => s + o.total, 0)
  const netRevenue      = grossRevenue - cancelledRev - returnedRev

  const costMap = Object.fromEntries((allCostPrices ?? products).map(p => [p.id, p.cost_price || 0]))
  const qualifyingOrders = orders.filter(o =>
    o.order_status !== 'cancelled' && o.order_status !== 'returned' &&
    (o.payment_method === 'cod' ? o.order_status === 'delivered' : o.payment_status === 'paid')
  )
  const grossProfit = qualifyingOrders.reduce((s, o) =>
    s + (o.items as OrderItem[]).reduce((si, i) => si + (i.price - (costMap[i.product_id] || 0)) * i.quantity, 0), 0
  )
  const qualifyingRevenue  = qualifyingOrders.reduce((s, o) => s + o.total, 0)
  const profitMarginPct    = qualifyingRevenue > 0 ? Math.round((grossProfit / qualifyingRevenue) * 100) : 0
  const profitLostToDiscounts = qualifyingOrders.reduce((s, o) =>
    s + (o.items as OrderItem[]).reduce((si, i) => si + ((i.original_price ?? i.price) - i.price) * i.quantity, 0), 0
  )

  const qualifyingPhoneMap: Record<string, number> = {}
  qualifyingOrders.forEach(o => {
    qualifyingPhoneMap[o.customer_phone] = (qualifyingPhoneMap[o.customer_phone] || 0) + 1
  })
  const uniqueRangeCustomers = Object.keys(qualifyingPhoneMap).length
  const repeatRangeCustomers = Object.values(qualifyingPhoneMap).filter(c => c > 1).length
  const repeatRangeRate      = uniqueRangeCustomers > 0 ? Math.round((repeatRangeCustomers / uniqueRangeCustomers) * 100) : 0
  const avgOrdersPerCustomer = uniqueRangeCustomers > 0 ? (qualifyingOrders.length / uniqueRangeCustomers).toFixed(1) : '0'

  const trendData      = buildTrendData(orders, range)
  const salesTrendRows = buildSalesTrendTable(orders, range)
  const salesMaxOrders = Math.max(...salesTrendRows.map(r => r.orders), 1)

  const paymentMap: Record<string, number> = {}
  activeOrders.forEach(o => { paymentMap[o.payment_method] = (paymentMap[o.payment_method] || 0) + 1 })
  const paymentData = Object.entries(paymentMap).map(([name, value]) => ({ name, value }))

  // ── Products — single pass ─────────────────────────────────────────────────
  const productMap:          Record<string, { units: number; revenue: number }> = {}
  const productRepeatMap:    Record<string, Record<string, number>> = {}
  const productSizeColorMap: Record<string, { colors: Record<string, number>; sizes: Record<string, number> }> = {}
  activeOrders.forEach(o => {
    ;(o.items as OrderItem[]).forEach(i => {
      if (!productMap[i.product_name])          productMap[i.product_name]          = { units: 0, revenue: 0 }
      if (!productRepeatMap[i.product_name])    productRepeatMap[i.product_name]    = {}
      if (!productSizeColorMap[i.product_name]) productSizeColorMap[i.product_name] = { colors: {}, sizes: {} }
      productMap[i.product_name].units   += i.quantity
      productMap[i.product_name].revenue += i.price * i.quantity
      productRepeatMap[i.product_name][o.customer_phone] = (productRepeatMap[i.product_name][o.customer_phone] || 0) + 1
      if (i.color && i.color !== '_') productSizeColorMap[i.product_name].colors[i.color] = (productSizeColorMap[i.product_name].colors[i.color] || 0) + i.quantity
      if (i.size  && i.size  !== '_') productSizeColorMap[i.product_name].sizes[i.size]   = (productSizeColorMap[i.product_name].sizes[i.size]   || 0) + i.quantity
    })
  })
  const allProductsInRange = Object.entries(productMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
  const productRepeatRates = Object.fromEntries(
    Object.entries(productRepeatMap).map(([name, phones]) => {
      const unique = Object.keys(phones).length
      const repeat = Object.values(phones).filter(c => c > 1).length
      return [name, unique > 1 ? Math.round((repeat / unique) * 100) : null]
    })
  ) as Record<string, number | null>

  // Product lookup helpers
  const productByName: Record<string, Product> = {}
  products.forEach(p => { productByName[p.name] = p })
  const productStockMap: Record<string, number> = {}
  products.forEach(p => { productStockMap[p.name] = getMerchStock(p) })

  // Per-product remaining stock by size and color (for sell-through per product)
  const productVariantRemainingMap: Record<string, { sizes: Record<string, number>; colors: Record<string, number> }> = {}
  products.forEach(p => {
    const vs = p.variant_stock
    if (!productVariantRemainingMap[p.name]) productVariantRemainingMap[p.name] = { sizes: {}, colors: {} }
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) => {
        const colorTotal = Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0)
        if (color !== '_') productVariantRemainingMap[p.name].colors[color] = (productVariantRemainingMap[p.name].colors[color] || 0) + colorTotal
        Object.entries(sizes as Record<string, number>).forEach(([size, qty]) => {
          if (size !== '_') productVariantRemainingMap[p.name].sizes[size] = (productVariantRemainingMap[p.name].sizes[size] || 0) + qty
        })
      })
    }
  })

  // Range days for velocity
  const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  const sevenDaysAgo  = new Date(Date.now() -  7 * 86400000)

  // Auto flags per top product
  const productFlagMap: Record<string, { label: string; color: string; bg: string }[]> = {}
  allProductsInRange.forEach(tp => {
    const p = productByName[tp.name]
    if (!p) return
    const flags: { label: string; color: string; bg: string }[] = []
    const stock = getMerchStock(p)
    if (p.is_bestseller || p.best_seller_score > 0) flags.push({ label: '★ Best Seller', color: '#92400E', bg: '#FEF9C3' })
    if (p.is_trending || p.trending_score > 0)       flags.push({ label: '↑ Trending',    color: '#9D174D', bg: '#FDF2F8' })
    if (new Date(p.created_at) >= thirtyDaysAgo)     flags.push({ label: '✦ New',         color: '#5B21B6', bg: '#F5F3FF' })
    if (stock === 0)       flags.push({ label: 'OUT OF STOCK',     color: '#991B1B', bg: '#FEE2E2' })
    else if (stock <= 2)   flags.push({ label: '🔥 Almost Gone',   color: '#DC2626', bg: '#FEE2E2' })
    else if (stock <= 5)   flags.push({ label: '⚠ Low Stock',      color: '#B45309', bg: '#FEF9C3' })
    productFlagMap[tp.name] = flags
  })

  // Colors and sizeMap (sizeMap still needed for sell-through)
  const colorMap: Record<string, number> = {}
  const sizeMap:  Record<string, number> = {}
  activeOrders.forEach(o => {
    ;(o.items as OrderItem[]).forEach(i => {
      if (i.color && i.color !== '_') colorMap[i.color] = (colorMap[i.color] || 0) + i.quantity
      if (i.size  && i.size  !== '_') sizeMap[i.size]   = (sizeMap[i.size]   || 0) + i.quantity
    })
  })
  const topColors = Object.entries(colorMap).map(([name, units]) => ({ name, units })).sort((a, b) => b.units - a.units).slice(0, 8)

  // Cities with revenue + AOV
  const cityDataMap: Record<string, { orders: number; revenue: number }> = {}
  activeOrders.forEach(o => {
    if (!cityDataMap[o.city]) cityDataMap[o.city] = { orders: 0, revenue: 0 }
    cityDataMap[o.city].orders++
    cityDataMap[o.city].revenue += o.total
  })
  const topCities = Object.entries(cityDataMap)
    .map(([name, d]) => ({ name, orders: d.orders, revenue: d.revenue, aov: Math.round(d.revenue / d.orders) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8)

  // ── Inventory ──────────────────────────────────────────────────────────────
  const lowStockItems: { name: string; variant: string; qty: number }[] = []
  let inventoryValue = 0
  products.forEach(p => {
    const vs = p.variant_stock
    const totalStock = getMerchStock(p)
    inventoryValue += (p.cost_price || 0) * totalStock
    if (vs && Object.keys(vs).length > 0) {
      Object.entries(vs).forEach(([color, sizes]) =>
        Object.entries(sizes).forEach(([size, qty]) => {
          if (qty > 0 && qty <= 3) {
            const variant = [color !== '_' ? color : '', size !== '_' ? size : ''].filter(Boolean).join(' / ')
            lowStockItems.push({ name: p.name, variant, qty })
          }
        })
      )
    } else if (p.stock_quantity > 0 && p.stock_quantity <= 3) {
      lowStockItems.push({ name: p.name, variant: 'All sizes', qty: p.stock_quantity })
    }
  })
  lowStockItems.sort((a, b) => a.qty - b.qty)

  // ── Cancellations ──────────────────────────────────────────────────────────
  const reasonMap: Record<string, number> = {}
  cancelledOrders.forEach(o => {
    let r = o.cancellation_reason || 'other'
    if (r === 'customer_changed_mind') r = 'changed_mind'
    reasonMap[r] = (reasonMap[r] || 0) + 1
  })
  const reasonData = Object.entries(reasonMap)
    .map(([key, count]) => ({ name: CANCEL_REASON_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
  const cancellationRate = orders.length > 0 ? ((cancelledOrders.length / orders.length) * 100).toFixed(1) : '0.0'

  // ── Returns ────────────────────────────────────────────────────────────────
  const returnReasonMap: Record<string, number> = {}
  returnedOrders.forEach(o => {
    const r = (o as Order & { return_reason?: string }).return_reason || 'other'
    returnReasonMap[r] = (returnReasonMap[r] || 0) + 1
  })
  const returnReasonData = Object.entries(returnReasonMap)
    .map(([key, count]) => ({ name: RETURN_REASON_LABELS[key] ?? key, count }))
    .sort((a, b) => b.count - a.count)
  const returnRate = orders.length > 0 ? ((returnedOrders.length / orders.length) * 100).toFixed(1) : '0.0'

  // ── Merchandising / Inventory shared ──────────────────────────────────────
  const productCategoryMap = Object.fromEntries(products.map(p => [p.id, p.product_category || 'Uncategorized']))
  const categoryPerfMap: Record<string, { revenue: number; units: number; orderCount: number }> = {}
  activeOrders.forEach(o => {
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
  const categoryPerf = Object.entries(categoryPerfMap).map(([cat, d]) => ({ cat, ...d })).sort((a, b) => b.revenue - a.revenue)

  const priceRangeBuckets = [
    { label: 'Under 1.5k', min: 0, max: 1500 },
    { label: '1.5k – 3k',  min: 1500, max: 3000 },
    { label: '3k – 5k',    min: 3000, max: 5000 },
    { label: '5k+',        min: 5000, max: Infinity },
  ]
  const priceRefMap = Object.fromEntries(products.map(p => [p.id, p.price]))
  const priceRangeStats = priceRangeBuckets.map(r => {
    let rev = 0, units = 0, cnt = 0
    activeOrders.forEach(o => {
      let inRange = false
      ;(o.items as OrderItem[]).forEach(item => {
        const price = priceRefMap[item.product_id] ?? item.price
        if (price >= r.min && price < r.max) { rev += item.price * item.quantity; units += item.quantity; inRange = true }
      })
      if (inRange) cnt++
    })
    return { label: r.label, revenue: rev, units, orderCount: cnt }
  })

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

  const eligibleMerch = products.filter(p => {
    const age = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return age >= 15 && getMerchStock(p) > 0
  })
  const merchAvgSellThrough = eligibleMerch.length > 0
    ? eligibleMerch.reduce((sum, p) => { const s = getMerchStock(p); return sum + p.total_sold / (p.total_sold + s) }, 0) / eligibleMerch.length
    : 0

  const slowMovers = products
    .filter(p => {
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
      if (ageDays < 15) return false
      const stock = getMerchStock(p)
      if (stock === 0 || merchAvgSellThrough === 0) return false
      return p.total_sold / (p.total_sold + stock) < merchAvgSellThrough * 0.5
    })
    .map(p => {
      const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return { ...p, ageDays: Math.floor(ageDays), velocity: p.total_sold / ageDays, stock: getMerchStock(p) }
    })
    .sort((a, b) => a.velocity - b.velocity)

  const deadInventory = products
    .filter(p => {
      const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
      // total_sold may be stale; also exclude products with any sales in current period
      const hasRecentSales = !!productMap[p.name]
      return ageDays > 15 && p.total_sold === 0 && !hasRecentSales && getMerchStock(p) >= 10
    })
    .map(p => ({ ...p, stock: getMerchStock(p), ageDays: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) }))
    .sort((a, b) => b.stock - a.stock)

  const justDropped = products
    .filter(p => new Date(p.created_at) >= sevenDaysAgo)
    .map(p => {
      const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return { ...p, ageDays: Math.floor(ageDays), stock: getMerchStock(p) }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const newArrivals = products
    .filter(p => new Date(p.created_at) >= thirtyDaysAgo)
    .map(p => {
      const ageDays = Math.max(1, (Date.now() - new Date(p.created_at).getTime()) / 86400000)
      return { ...p, ageDays: Math.floor(ageDays), velocity: p.total_sold / ageDays, stock: getMerchStock(p) }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const categoryStockMap: Record<string, { stock: number; sold: number; count: number }> = {}
  products.forEach(p => {
    const cat = p.product_category || 'Uncategorized'
    if (!categoryStockMap[cat]) categoryStockMap[cat] = { stock: 0, sold: 0, count: 0 }
    categoryStockMap[cat].stock += getMerchStock(p)
    categoryStockMap[cat].sold  += p.total_sold
    categoryStockMap[cat].count++
  })
  const categoryStockData = Object.entries(categoryStockMap).map(([cat, d]) => ({ cat, ...d })).sort((a, b) => b.stock - a.stock)

  const bestSellerChartData = products
    .filter(p => p.is_bestseller || p.best_seller_score > 0)
    .sort((a, b) => b.best_seller_score - a.best_seller_score)
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      shortName: p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name,
      score: p.best_seller_score,
      total_sold: p.total_sold,
      category: p.product_category || 'Uncategorized',
      stock: getMerchStock(p),
      revenue: productMap[p.name]?.revenue || 0,
      units: productMap[p.name]?.units || 0,
    }))

  const trendingChartData = products
    .filter(p => p.trending_score > 0)
    .sort((a, b) => b.trending_score - a.trending_score)
    .slice(0, 10)
    .map(p => ({
      name: p.name,
      shortName: p.name.length > 16 ? p.name.slice(0, 15) + '…' : p.name,
      score: p.trending_score,
      total_sold: p.total_sold,
      category: p.product_category || 'Uncategorized',
      stock: getMerchStock(p),
      revenue: productMap[p.name]?.revenue || 0,
      units: productMap[p.name]?.units || 0,
    }))

  const categoryMerged = categoryStockData.map(cs => {
    const perf = categoryPerf.find(cp => cp.cat === cs.cat)
    return {
      cat: cs.cat,
      stock: cs.stock,
      allTimeSold: cs.sold,
      count: cs.count,
      revenue: perf?.revenue || 0,
      units: perf?.units || 0,
      orders: perf?.orderCount || 0,
    }
  }).sort((a, b) => b.stock - a.stock)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'revenue',     label: 'Revenue' },
    { key: 'performance', label: 'Performance' },
    { key: 'products',    label: 'Products' },
    { key: 'inventory',   label: 'Inventory' },
    { key: 'orders',      label: 'Orders' },
  ]

  return (
    <div className="space-y-6">
      {/* Range selector */}
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
      <div className="flex gap-1 border-b overflow-x-auto scrollbar-hide" style={{ borderColor: '#E8DDD4' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap shrink-0"
            style={tab === t.key
              ? { borderColor: '#A68B6E', color: '#1C1C1C' }
              : { borderColor: 'transparent', color: '#9CA3AF' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          REVENUE TAB — financial summary only
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Gross Revenue',         value: pkr(grossRevenue),   color: '#1C1C1C' },
              { label: 'Net Revenue',           value: pkr(netRevenue),     color: '#10B981' },
              { label: 'Gross Profit',          value: pkr(grossProfit),    color: grossProfit >= 0 ? '#10B981' : '#EF4444',
                sub: `${profitMarginPct}% margin · COD counted on delivery` },
              { label: 'Unique Customers',      value: uniqueRangeCustomers.toString(), color: '#1C1C1C' },
              { label: 'Repeat Rate',           value: `${repeatRangeRate}%`,
                color: repeatRangeRate > 0 ? '#A68B6E' : '#9CA3AF',
                sub: `${repeatRangeCustomers} repeat customers` },
              { label: 'Avg Orders / Customer', value: avgOrdersPerCustomer, color: '#1C1C1C' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-lg font-bold" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
                {'sub' in k && k.sub && <p className="text-xs mt-0.5" style={{ color: '#A68B6E' }}>{k.sub}</p>}
              </div>
            ))}
          </div>

          {profitLostToDiscounts > 0 && (
            <div className="rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-sm"
              style={{ backgroundColor: '#FFF8F2', border: '1px solid #F0E4D4' }}>
              <span style={{ color: '#6B7280' }}>Profit reduced by discounts/sales this period:</span>
              <span className="font-semibold" style={{ color: '#C62828' }}>−{pkr(profitLostToDiscounts)}</span>
            </div>
          )}

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }}
                  interval={trendData.length > 10 ? Math.ceil(trendData.length / 6) - 1 : 0} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} width={50} />
                <Tooltip formatter={(v) => pkr(Number(v))} />
                <Line type="monotone" dataKey="revenue" stroke="#A68B6E" strokeWidth={2.5} dot={{ fill: '#A68B6E', r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Payment Methods</h3>
            {paymentData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={paymentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={70}>
                      {paymentData.map((_, i) => <Cell key={i} fill={PAYMENT_COLORS[i % PAYMENT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                  {paymentData.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-1.5 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: PAYMENT_COLORS[i % PAYMENT_COLORS.length] }} />
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PERFORMANCE TAB — all sales intelligence in one place
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'performance' && (
        <div className="space-y-8">

          {/* 1 · Sales Over Time */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Sales Over Time</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {range === '12m' ? 'Monthly' : range === '90d' ? 'Weekly' : 'Daily'} · hover for details
              </span>
            </div>
            {salesTrendRows.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesTrendRows} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }}
                    interval={salesTrendRows.length > 10 ? Math.ceil(salesTrendRows.length / 6) - 1 : 0} />
                  <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { orders: number; revenue: number; units: number; aov: number }
                      return (
                        <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{label}</p>
                          <p style={{ color: '#1C1C1C' }}>{d.orders} orders · {d.units} units</p>
                          <p style={{ color: '#A68B6E' }}>PKR {d.revenue.toLocaleString()}</p>
                          <p style={{ color: '#6B7280' }}>AOV PKR {d.aov.toLocaleString()}</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]} name="Orders">
                    {salesTrendRows.map((entry, i) => (
                      <Cell key={i} fill={
                        entry.orders === 0 ? '#E8DDD4'
                        : entry.orders >= salesMaxOrders * 0.8 ? '#1C1C1C'
                        : entry.orders >= salesMaxOrders * 0.5 ? '#A68B6E'
                        : '#C9956C'
                      } />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No sales in this period.</p>
            )}
          </div>

          {/* 2 · Period Breakdown Table */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold text-sm">Period Breakdown</h3>
            </div>
            {salesTrendRows.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No data.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
                    <tr>
                      <th className="text-left px-5 py-3 font-medium" style={{ color: '#6B7280' }}>Period</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Orders</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Units</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>Revenue</th>
                      <th className="text-right px-4 py-3 font-medium" style={{ color: '#6B7280' }}>AOV</th>
                      <th className="text-right px-5 py-3 font-medium" style={{ color: '#6B7280' }}>vs Prev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...salesTrendRows].reverse().map((row, i) => (
                      <tr key={i} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-5 py-3 text-sm">{row.label}</td>
                        <td className="px-4 py-3 text-right text-sm" style={{ color: '#6B7280' }}>{row.orders}</td>
                        <td className="px-4 py-3 text-right text-sm" style={{ color: '#6B7280' }}>{row.units}</td>
                        <td className="px-4 py-3 text-right text-sm font-medium">PKR {row.revenue.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right text-xs" style={{ color: '#9CA3AF' }}>
                          {row.aov > 0 ? `PKR ${row.aov.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {row.growth === null ? <span style={{ color: '#D1D5DB' }}>—</span>
                            : row.growth === 0 ? <span style={{ color: '#9CA3AF' }}>0%</span>
                            : row.growth > 0
                              ? <span className="font-medium" style={{ color: '#10B981' }}>↑ {row.growth}%</span>
                              : <span className="font-medium" style={{ color: '#EF4444' }}>↓ {Math.abs(row.growth)}%</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t" style={{ borderColor: '#E8DDD4' }}>
                    <tr style={{ backgroundColor: '#FAF8F5' }}>
                      <td className="px-5 py-3 font-semibold">Total</td>
                      <td className="px-4 py-3 text-right font-semibold">{salesTrendRows.reduce((s, r) => s + r.orders, 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{salesTrendRows.reduce((s, r) => s + r.units, 0)}</td>
                      <td className="px-4 py-3 text-right font-semibold">PKR {salesTrendRows.reduce((s, r) => s + r.revenue, 0).toLocaleString()}</td>
                      <td className="px-4 py-3" />
                      <td className="px-5 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* 3 · Price Range Performance */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Price Range Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priceRangeStats.map(r => (
                <div key={r.label} className="rounded-lg p-3 border text-center" style={{ borderColor: '#E8DDD4' }}>
                  <p className="text-sm font-semibold" style={{ color: '#A68B6E' }}>{r.label}</p>
                  <p className="text-lg font-bold mt-1">{r.units}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>units sold</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: '#374151' }}>PKR {Math.round(r.revenue / 1000)}k</p>
                </div>
              ))}
            </div>
          </div>

          {/* 4 · Cities */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Cities</h3>
            {topCities.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topCities} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as { name: string; orders: number; revenue: number; aov: number }
                        return (
                          <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                            <p className="font-semibold">{d.name}</p>
                            <p style={{ color: '#A68B6E' }}>PKR {d.revenue.toLocaleString()}</p>
                            <p style={{ color: '#6B7280' }}>{d.orders} orders · AOV PKR {d.aov.toLocaleString()}</p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} name="Revenue">
                      {topCities.map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#1C1C1C' : i <= 2 ? '#A68B6E' : i <= 4 ? '#C9956C' : '#D4B896'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <table className="w-full mt-4 text-xs" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <th className="text-left py-1.5 font-medium" style={{ color: '#6B7280' }}>City</th>
                      <th className="text-right py-1.5 font-medium px-3" style={{ color: '#6B7280' }}>Orders</th>
                      <th className="text-right py-1.5 font-medium px-3" style={{ color: '#6B7280' }}>Revenue</th>
                      <th className="text-right py-1.5 font-medium" style={{ color: '#6B7280' }}>AOV</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCities.map(c => (
                      <tr key={c.name} style={{ borderBottom: '1px solid #F9FAFB' }}>
                        <td className="py-1.5 font-medium">{c.name}</td>
                        <td className="py-1.5 px-3 text-right" style={{ color: '#6B7280' }}>{c.orders}</td>
                        <td className="py-1.5 px-3 text-right" style={{ color: '#6B7280' }}>{pkr(c.revenue)}</td>
                        <td className="py-1.5 text-right" style={{ color: '#6B7280' }}>PKR {c.aov.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No data.</p>
            )}
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          PRODUCTS TAB — all product intelligence
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'products' && (
        <div className="space-y-8">

          {/* 1 · Product Performance chart + table */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Product Performance</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {allProductsInRange.length > 20 ? 'Top 20 by revenue · ' : ''}{range === '12m' ? '12 months' : range === '90d' ? '90 days' : range === '30d' ? '30 days' : '7 days'}
              </span>
            </div>
            {allProductsInRange.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No sales in this period.</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={Math.max(200, Math.min(allProductsInRange.length, 20) * 38)}>
                  <BarChart data={allProductsInRange.slice(0, 20)} layout="vertical" margin={{ left: 8, right: 24 }}>
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120}
                      tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 15) + '…' : v} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const d = payload[0]?.payload as { name: string; units: number; revenue: number }
                        const stock = productStockMap[d.name] ?? 0
                        const prod  = productByName[d.name]
                        return (
                          <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                            <p className="font-semibold mb-1">{d.name}</p>
                            {prod?.product_category && <p style={{ color: '#9CA3AF' }}>{prod.product_category}</p>}
                            <p style={{ color: '#A68B6E' }}>{pkr(d.revenue)}</p>
                            <p style={{ color: '#6B7280' }}>{d.units} units sold</p>
                            <p style={{ color: stock === 0 ? '#DC2626' : stock <= 5 ? '#B45309' : '#374151' }}>
                              {stock === 0 ? 'OUT OF STOCK' : `${stock} left`}
                            </p>
                          </div>
                        )
                      }}
                    />
                    <Bar dataKey="units" radius={[0, 4, 4, 0]} name="Units">
                      {allProductsInRange.slice(0, 20).map((_, i) => (
                        <Cell key={i} fill={i === 0 ? '#1C1C1C' : i <= 2 ? '#A68B6E' : i <= 5 ? '#C9956C' : '#D4B896'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className="overflow-x-auto mt-6">
                  <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
                        <th className="text-left py-2 font-medium" style={{ color: '#6B7280' }}>Product</th>
                        <th className="text-left py-2 font-medium px-2" style={{ color: '#6B7280' }}>Collection</th>
                        <th className="text-right py-2 font-medium px-2" style={{ color: '#6B7280' }}>Units</th>
                        <th className="text-right py-2 font-medium px-2" style={{ color: '#6B7280' }}>Revenue</th>
                        <th className="text-right py-2 font-medium px-2" style={{ color: '#6B7280' }}>Velocity</th>
                        <th className="text-right py-2 font-medium px-2" style={{ color: '#6B7280' }}>Stock</th>
                        <th className="text-right py-2 font-medium px-2" style={{ color: '#6B7280' }}>Repeat %</th>
                        <th className="text-left py-2 font-medium px-2" style={{ color: '#6B7280' }}>Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allProductsInRange.map(p => {
                        const rr    = productRepeatRates[p.name]
                        const stock = productStockMap[p.name] ?? 0
                        const prod  = productByName[p.name]
                        const vel   = (p.units / rangeDays).toFixed(1)
                        const flags = productFlagMap[p.name] ?? []
                        return (
                          <tr key={p.name} style={{ borderBottom: '1px solid #F9FAFB' }}>
                            <td className="py-2 pr-2 font-medium truncate max-w-[130px]">{p.name}</td>
                            <td className="py-2 px-2" style={{ color: '#9CA3AF' }}>{prod?.product_category || '—'}</td>
                            <td className="py-2 px-2 text-right" style={{ color: '#6B7280' }}>{p.units}</td>
                            <td className="py-2 px-2 text-right" style={{ color: '#6B7280' }}>{pkr(p.revenue)}</td>
                            <td className="py-2 px-2 text-right" style={{ color: '#6B7280' }}>{vel}/d</td>
                            <td className="py-2 px-2 text-right font-medium"
                              style={{ color: stock === 0 ? '#DC2626' : stock <= 5 ? '#B45309' : '#374151' }}>
                              {stock === 0 ? 'OUT' : stock}
                            </td>
                            <td className="py-2 px-2 text-right font-medium"
                              style={{ color: rr == null ? '#9CA3AF' : rr >= 20 ? '#10B981' : rr === 0 ? '#EF4444' : '#374151' }}>
                              {rr == null ? '—' : `${rr}%`}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex flex-wrap gap-1">
                                {flags.map(f => (
                                  <span key={f.label} className="text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap"
                                    style={{ backgroundColor: f.bg, color: f.color }}>{f.label}</span>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* 2 · Best Sellers chart */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">★ Best Sellers</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>by all-time score · hover for details</span>
            </div>
            {bestSellerChartData.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No best sellers flagged yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, bestSellerChartData.length * 42)}>
                <BarChart data={bestSellerChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as typeof bestSellerChartData[0]
                      return (
                        <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{d.name}</p>
                          <p style={{ color: '#9CA3AF' }}>{d.category}</p>
                          <p style={{ color: '#A68B6E' }}>{pkr(d.revenue)} this period</p>
                          <p style={{ color: '#6B7280' }}>{d.units} units sold · {d.total_sold} all time</p>
                          <p style={{ color: d.stock === 0 ? '#DC2626' : d.stock <= 5 ? '#B45309' : '#166534' }}>
                            {d.stock === 0 ? '⚠ OUT OF STOCK — restock urgently' : d.stock <= 5 ? `⚠ Only ${d.stock} left — restock soon` : `${d.stock} in stock`}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="total_sold" fill="#92400E" radius={[0, 4, 4, 0]} name="Total Sold">
                    {bestSellerChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.stock === 0 ? '#DC2626' : entry.stock <= 5 ? '#F59E0B' : '#A68B6E'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 3 · Trending chart */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">↑ Trending Now</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>by trending score · hover for details</span>
            </div>
            {trendingChartData.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No trending products right now.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, trendingChartData.length * 42)}>
                <BarChart data={trendingChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} tickFormatter={v => v.toFixed(1)} />
                  <YAxis type="category" dataKey="shortName" tick={{ fontSize: 10 }} width={120} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as typeof trendingChartData[0]
                      return (
                        <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{d.name}</p>
                          <p style={{ color: '#9CA3AF' }}>{d.category}</p>
                          <p style={{ color: '#A68B6E' }}>{pkr(d.revenue)} this period</p>
                          <p style={{ color: '#6B7280' }}>{d.units} units sold · score {d.score.toFixed(1)}</p>
                          <p style={{ color: d.stock === 0 ? '#DC2626' : d.stock <= 5 ? '#B45309' : '#166534' }}>
                            {d.stock === 0 ? '⚠ OUT OF STOCK — restock urgently' : d.stock <= 5 ? `⚠ Only ${d.stock} left — restock soon` : `${d.stock} in stock`}
                          </p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="score" fill="#9D174D" radius={[0, 4, 4, 0]} name="Trend Score">
                    {trendingChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.stock === 0 ? '#DC2626' : entry.stock <= 5 ? '#F59E0B' : '#BE185D'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 4 · Category Performance chart */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-semibold">Category Performance</h3>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>revenue by category · auto-updates with new categories</span>
            </div>
            {categoryPerf.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No category data — assign collections to products first.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(180, categoryPerf.length * 60)}>
                <BarChart data={categoryPerf} margin={{ left: 8, right: 24, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE3" vertical={false} />
                  <XAxis dataKey="cat" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${Math.round(Number(v) / 1000)}k`} width={40} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as { cat: string; revenue: number; units: number; orderCount: number }
                      return (
                        <div className="rounded-lg px-3 py-2.5 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{d.cat}</p>
                          <p style={{ color: '#A68B6E' }}>{pkr(d.revenue)}</p>
                          <p style={{ color: '#6B7280' }}>{d.units} units · {d.orderCount} orders</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]} name="Revenue">
                    {categoryPerf.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? '#A68B6E' : i === 1 ? '#C9956C' : i === 2 ? '#8B7355' : '#D4B896'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* 5 · Sizes & Colors by Product */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-1">Sizes & Colors by Product</h3>
            <p className="text-xs mb-5" style={{ color: '#9CA3AF' }}>Top 8 by revenue · sold in period · remaining stock · sell-through %</p>
            {allProductsInRange.slice(0, 8).filter(p => {
              const sc = productSizeColorMap[p.name]
              return sc && (Object.keys(sc.sizes).length > 0 || Object.keys(sc.colors).length > 0)
            }).length === 0 ? (
              <p className="text-sm" style={{ color: '#9CA3AF' }}>No size or color data available.</p>
            ) : (
              <div className="space-y-6">
                {allProductsInRange.slice(0, 8).map(tp => {
                  const sc  = productSizeColorMap[tp.name]
                  const rem = productVariantRemainingMap[tp.name]
                  const prod = productByName[tp.name]
                  const collection = prod?.product_category || ''
                  if (!sc || (Object.keys(sc.sizes).length === 0 && Object.keys(sc.colors).length === 0)) return null

                  const renderBars = (soldMap: Record<string, number>, remMap: Record<string, number>) =>
                    Object.entries(soldMap).sort((a, b) => b[1] - a[1]).map(([key, sold]) => {
                      const remaining = remMap?.[key] || 0
                      const total = sold + remaining
                      const pct = total > 0 ? Math.round((sold / total) * 100) : 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="w-14 text-xs font-medium shrink-0 text-right truncate">{key}</span>
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                            <div className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: pct >= 70 ? '#10B981' : pct >= 40 ? '#A68B6E' : '#F59E0B' }} />
                          </div>
                          <span className="text-xs shrink-0 w-8 text-right font-medium" style={{ color: '#6B7280' }}>{pct}%</span>
                          <span className="text-xs shrink-0 hidden sm:inline" style={{ color: '#9CA3AF' }}>{sold} sold · {remaining} left</span>
                        </div>
                      )
                    })

                  return (
                    <div key={tp.name}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold">{tp.name}</span>
                        {collection && (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>{collection}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        {Object.keys(sc.sizes).length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>SIZES</p>
                            <div className="space-y-1.5">{renderBars(sc.sizes, rem?.sizes || {})}</div>
                          </div>
                        )}
                        {Object.keys(sc.colors).length > 0 && (
                          <div>
                            <p className="text-xs font-medium mb-2" style={{ color: '#9CA3AF' }}>COLORS</p>
                            <div className="space-y-1.5">{renderBars(sc.colors, rem?.colors || {})}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 6 · Top Colors */}
          {topColors.length > 0 && (
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Top Colors</h3>
              <ResponsiveContainer width="100%" height={Math.max(160, topColors.length * 38)}>
                <BarChart data={topColors} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(v) => [`${v} units`, 'Units Sold']} />
                  <Bar dataKey="units" fill="#A68B6E" radius={[0, 4, 4, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 7 · Price Range Performance */}
          <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
            <h3 className="font-semibold mb-4">Price Range Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {priceRangeStats.map(r => (
                <div key={r.label} className="rounded-lg p-3 border text-center" style={{ borderColor: '#E8DDD4' }}>
                  <p className="text-sm font-semibold" style={{ color: '#A68B6E' }}>{r.label}</p>
                  <p className="text-lg font-bold mt-1">{r.units}</p>
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>units sold</p>
                  <p className="text-xs mt-0.5 font-medium" style={{ color: '#374151' }}>PKR {Math.round(r.revenue / 1000)}k</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          INVENTORY TAB — stock health only
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'inventory' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              {inventoryValue === 0 && products.length > 0 ? (
                <>
                  <p className="text-xl font-bold">PKR 0</p>
                  <p className="text-xs text-gray-500 mt-1">Inventory Value (at cost)</p>
                  <p className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>Set cost prices on products to calculate</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold">{pkr(inventoryValue)}</p>
                  <p className="text-xs text-gray-500 mt-1">Inventory Value (at cost)</p>
                </>
              )}
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold" style={{ color: lowStockItems.length > 0 ? '#F59E0B' : '#10B981' }}>{lowStockItems.length}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Low Stock variants</p>
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold" style={{ color: deadInventory.length > 0 ? '#EF4444' : '#10B981' }}>{deadInventory.length}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Dead Stock items</p>
            </div>
            <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
              <p className="text-xl font-bold">{products.length}</p>
              <p className="text-xs mt-1" style={{ color: '#6B7280' }}>Total SKUs</p>
            </div>
          </div>

          {/* Stock & Sales by Category */}
          {categoryMerged.length > 0 && (
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-1">Stock & Sales by Category</h3>
              <p className="text-xs mb-4" style={{ color: '#9CA3AF' }}>Stock remaining · hover for revenue and units sold in period</p>
              <ResponsiveContainer width="100%" height={Math.max(160, categoryMerged.length * 40)}>
                <BarChart data={categoryMerged} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="cat" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]?.payload as typeof categoryMerged[0]
                      const total = d.stock + d.allTimeSold
                      const pct = total > 0 ? Math.round((d.allTimeSold / total) * 100) : 0
                      return (
                        <div className="rounded-lg px-3 py-2 shadow-md text-xs border bg-white space-y-0.5" style={{ borderColor: '#E8DDD4' }}>
                          <p className="font-semibold mb-1">{d.cat}</p>
                          <p style={{ color: '#374151' }}>{d.stock} units in stock</p>
                          <p style={{ color: '#A68B6E' }}>{pkr(d.revenue)} this period</p>
                          <p style={{ color: '#6B7280' }}>{d.units} units sold · {d.orders} orders this period</p>
                          <p style={{ color: '#9CA3AF' }}>{pct}% sell-through · {d.count} products</p>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="stock" fill="#A68B6E" radius={[0, 4, 4, 0]} name="Stock" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Low Stock */}
          {lowStockItems.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4', backgroundColor: '#FFFBEB' }}>
                <h3 className="font-semibold text-sm" style={{ color: '#92400E' }}>⚠ Low Stock</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF9C3', color: '#92400E' }}>{lowStockItems.length}</span>
                <span className="text-xs ml-auto" style={{ color: '#B45309' }}>1–3 units remaining</span>
              </div>
              <div className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {lowStockItems.map((item, i) => (
                  <div key={i} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{item.name}</p>
                      {item.variant && <p className="text-xs" style={{ color: '#9CA3AF' }}>{item.variant}</p>}
                    </div>
                    <span className="text-xs font-semibold shrink-0 px-2 py-0.5 rounded"
                      style={{ backgroundColor: item.qty === 1 ? '#FEE2E2' : '#FEF9C3', color: item.qty === 1 ? '#DC2626' : '#92400E' }}>
                      {item.qty} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Size Sell-Through */}
          {sizeSellThrough.length > 0 && (
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <div className="flex items-baseline gap-2 mb-4">
                <h3 className="font-semibold">Size Sell-Through</h3>
                <span className="text-xs" style={{ color: '#9CA3AF' }}>sold ÷ (sold + remaining stock)</span>
              </div>
              <div className="space-y-2.5">
                {sizeSellThrough.map(s => (
                  <div key={s.sz} className="flex items-center gap-3">
                    <span className="w-10 text-sm font-medium text-right shrink-0">{s.sz}</span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${s.pct}%`, backgroundColor: s.pct >= 70 ? '#10B981' : s.pct >= 40 ? '#A68B6E' : '#F59E0B' }} />
                    </div>
                    <span className="text-xs shrink-0 w-12 text-right font-medium" style={{ color: '#6B7280' }}>{s.pct}%</span>
                    <span className="text-xs shrink-0 hidden sm:inline" style={{ color: '#9CA3AF' }}>{s.sold} sold · {s.remaining} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Just Dropped */}
          {justDropped.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold text-sm">Just Dropped</h3>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#F3F4F6', color: '#374151' }}>last 7 days</span>
              </div>
              <ul className="divide-y" style={{ borderColor: '#F3F4F6' }}>
                {justDropped.map(p => (
                  <li key={p.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.name}</p>
                      {p.product_category && <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>
                        {p.ageDays === 0 ? 'today' : `${p.ageDays}d ago`}
                      </span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={p.stock === 0 ? { backgroundColor: '#FEE2E2', color: '#DC2626' }
                          : p.stock <= 3 ? { backgroundColor: '#FEF9C3', color: '#92400E' }
                          : { backgroundColor: '#F0FDF4', color: '#166534' }}>
                        {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* New Arrivals */}
          {newArrivals.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold text-sm">New Arrivals — last 30 days</h3>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b" style={{ borderColor: '#E8DDD4' }}>
                  <tr>
                    <th className="text-left px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Product</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Days Live</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Sold</th>
                    <th className="text-right px-4 py-2.5 font-medium" style={{ color: '#6B7280' }}>Stock Left</th>
                    <th className="text-right px-5 py-2.5 font-medium" style={{ color: '#6B7280' }}>Velocity</th>
                  </tr>
                </thead>
                <tbody>
                  {newArrivals.map(p => (
                    <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                      <td className="px-5 py-3">
                        <p className="font-medium">{p.name}</p>
                        {p.product_category && <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs" style={{ color: '#9CA3AF' }}>{p.ageDays}d</td>
                      <td className="px-4 py-3 text-right">{p.total_sold}</td>
                      <td className="px-4 py-3 text-right font-medium"
                        style={{ color: p.stock === 0 ? '#DC2626' : p.stock <= 5 ? '#B45309' : '#374151' }}>
                        {p.stock === 0 ? 'OUT' : p.stock}
                      </td>
                      <td className="px-5 py-3 text-right text-xs">
                        {p.velocity >= 1 ? <span style={{ color: '#10B981' }}>{p.velocity.toFixed(1)}/d</span>
                          : p.velocity > 0 ? <span style={{ color: '#F59E0B' }}>{p.velocity.toFixed(2)}/d</span>
                          : <span style={{ color: '#D1D5DB' }}>no sales</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Slow Movers */}
          <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
            <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold text-sm">Slow Movers</h3>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>{slowMovers.length}</span>
              <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>sell-through &lt; 50% of store avg · 15+ days old</span>
            </div>
            {slowMovers.length === 0 ? (
              <p className="px-5 py-4 text-sm" style={{ color: '#10B981' }}>No slow movers — all products are selling well.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
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
                          {p.product_category && <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>}
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
                </div>
                {slowMovers.length > 15 && (
                  <p className="px-5 py-2.5 text-xs border-t" style={{ color: '#9CA3AF', borderColor: '#F3F4F6' }}>
                    …and {slowMovers.length - 15} more
                  </p>
                )}
              </>
            )}
          </div>

          {/* Dead Inventory */}
          {deadInventory.length > 0 && (
            <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
              <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: '#E8DDD4' }}>
                <h3 className="font-semibold text-sm">Dead Inventory</h3>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF2F2', color: '#B91C1C' }}>{deadInventory.length}</span>
                <span className="text-xs ml-auto" style={{ color: '#9CA3AF' }}>0 sales · stock ≥ 10 · 15+ days old</span>
              </div>
              <div className="overflow-x-auto">
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
                  {deadInventory.map(p => {
                    const ageBadge = p.ageDays >= 180 ? { label: '6m+', color: '#991B1B', bg: '#FEE2E2' }
                      : p.ageDays >= 90 ? { label: '3m+', color: '#DC2626', bg: '#FEF2F2' }
                      : { label: '1m+', color: '#F87171', bg: '#FFF1F2' }
                    return (
                      <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                        <td className="px-5 py-3">
                          <p className="font-medium">{p.name}</p>
                          {p.product_category && <p className="text-xs" style={{ color: '#9CA3AF' }}>{p.product_category}</p>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: ageBadge.bg, color: ageBadge.color }}>
                            {ageBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium" style={{ color: '#EF4444' }}>{p.stock}</td>
                        <td className="px-5 py-3 text-right">PKR {p.price.toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {lowStockItems.length === 0 && deadInventory.length === 0 && (
            <p className="text-sm py-4" style={{ color: '#10B981' }}>No stock health issues detected.</p>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ORDERS TAB — cancellations + returns merged
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'orders' && (
        <div className="space-y-6">

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[
              { label: 'Cancellation Rate', value: `${cancellationRate}%`, color: '#EF4444' },
              { label: 'Return Rate',        value: `${returnRate}%`,        color: '#EF4444' },
              { label: 'Orders Cancelled',   value: cancelledOrders.length,  color: '#1C1C1C' },
              { label: 'Orders Returned',    value: returnedOrders.length,   color: '#1C1C1C' },
              { label: 'Revenue Leakage',    value: pkr(cancelledRev + returnedRev), color: '#EF4444' },
            ].map(k => (
              <div key={k.label} className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
                <p className="text-base sm:text-xl font-bold break-all" style={{ color: k.color }}>{k.value}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Why Orders Were Cancelled</h3>
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
                <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No cancellations in this period.</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-5 border" style={{ borderColor: '#E8DDD4' }}>
              <h3 className="font-semibold mb-4">Why Orders Were Returned</h3>
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
                <p className="text-sm text-center py-8" style={{ color: '#9CA3AF' }}>No returns in this period.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
