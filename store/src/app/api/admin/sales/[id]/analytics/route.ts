import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { OrderItem } from '@/types'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(*, products(id, name, price, cost_price))')
    .eq('id', id)
    .single()

  if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 })

  type SaleProductInfo = { sale_price: number; original_price: number; cost_price: number; name: string }
  const saleProductMap: Record<string, SaleProductInfo> = {}
  for (const sp of sale.sale_products || []) {
    if (sp.products) {
      saleProductMap[sp.product_id] = {
        sale_price: sp.sale_price,
        original_price: sp.products.price,
        cost_price: sp.products.cost_price || 0,
        name: sp.products.name,
      }
    }
  }

  const saleProductIds = Object.keys(saleProductMap)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, created_at, items, order_status')
    .eq('is_sale', true)
    .not('order_status', 'in', '("cancelled","returned")')
    .order('created_at', { ascending: true })

  // Match orders that contain at least one product from this sale AND were
  // placed while this specific sale was live — product-id membership alone
  // isn't enough, since a product can be reused across sales and its old
  // orders from a previous sale would otherwise get misattributed here.
  const windowStart = new Date(sale.starts_at || sale.created_at)
  const windowEnd = sale.ends_at ? new Date(sale.ends_at) : null
  const relevantOrders = (orders || []).filter(o => {
    const orderDate = new Date(o.created_at)
    if (orderDate < windowStart || (windowEnd && orderDate > windowEnd)) return false
    const items = (o.items || []) as OrderItem[]
    return items.some(item => saleProductIds.includes(item.product_id))
  })

  // Per-product stats
  const stats: Record<string, { units: number; sale_revenue: number; full_revenue: number; cost: number }> = {}
  for (const pid of saleProductIds) stats[pid] = { units: 0, sale_revenue: 0, full_revenue: 0, cost: 0 }

  // Daily trend
  const trendMap: Record<string, { sale_revenue: number; full_revenue: number; orders: number }> = {}

  for (const order of relevantOrders) {
    const dateKey = order.created_at.slice(0, 10)
    if (!trendMap[dateKey]) trendMap[dateKey] = { sale_revenue: 0, full_revenue: 0, orders: 0 }
    trendMap[dateKey].orders++

    for (const item of (order.items || []) as OrderItem[]) {
      if (!saleProductIds.includes(item.product_id)) continue
      const qty = item.quantity || 1
      const saleRev = item.price * qty
      const fullRev = (item.original_price || item.price) * qty
      const costUnit = saleProductMap[item.product_id]?.cost_price || 0

      stats[item.product_id].units += qty
      stats[item.product_id].sale_revenue += saleRev
      stats[item.product_id].full_revenue += fullRev
      stats[item.product_id].cost += costUnit * qty

      trendMap[dateKey].sale_revenue += saleRev
      trendMap[dateKey].full_revenue += fullRev
    }
  }

  const saleProductData = saleProductIds.map(pid => {
    const info = saleProductMap[pid]
    const s = stats[pid]
    return {
      product_id: pid,
      product_name: info.name,
      cost_price: info.cost_price,
      original_price: info.original_price,
      sale_price: info.sale_price,
      discount_pct: info.original_price > 0
        ? Math.round((1 - info.sale_price / info.original_price) * 100)
        : 0,
      units_sold: s.units,
      revenue_at_sale: s.sale_revenue,
      revenue_at_full: s.full_revenue,
      cost_total: s.cost,
      profit_at_sale: s.sale_revenue - s.cost,
      profit_at_full: s.full_revenue - s.cost,
      sacrifice: s.full_revenue - s.sale_revenue,
    }
  }).sort((a, b) => b.units_sold - a.units_sold)

  const revenueTrend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }))

  const totals = saleProductData.reduce(
    (acc, p) => ({
      total_orders: acc.total_orders,
      sale_revenue: acc.sale_revenue + p.revenue_at_sale,
      full_price_revenue: acc.full_price_revenue + p.revenue_at_full,
      cost_total: acc.cost_total + p.cost_total,
      profit_at_sale: acc.profit_at_sale + p.profit_at_sale,
      profit_at_full: acc.profit_at_full + p.profit_at_full,
      sacrifice: acc.sacrifice + p.sacrifice,
    }),
    { total_orders: relevantOrders.length, sale_revenue: 0, full_price_revenue: 0, cost_total: 0, profit_at_sale: 0, profit_at_full: 0, sacrifice: 0 }
  )

  // Don't trust the raw is_active column alone — the lazy-deactivation write
  // elsewhere can lag, so re-derive from ends_at here too.
  const isActuallyActive = sale.is_active && (!sale.ends_at || new Date(sale.ends_at) > new Date())

  return NextResponse.json({
    sale_id: id,
    is_active: isActuallyActive,
    has_orders: relevantOrders.length > 0,
    saleProductData,
    revenueTrend,
    totals,
  })
}
