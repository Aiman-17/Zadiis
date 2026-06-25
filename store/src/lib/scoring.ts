import { supabaseAdmin } from '@/lib/supabase/server'
import type { OrderItem } from '@/types'

type ProductRow = {
  id: string
  total_sold: number
  stock_quantity: number
  variant_stock: Record<string, Record<string, number>> | null
}

function getTotalStock(p: ProductRow): number {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes).reduce((s, q) => s + (q as number), 0),
      0
    )
  }
  return p.stock_quantity
}

// best_seller_score:
//   velocity    (30%) — units sold per day over last 30d
//   sell_through (40%) — total_sold / (total_sold + current_stock) × 100
//   volume       (20%) — capped at 200 all-time sales → 100 pts
//   acceleration (10%) — last-7d share vs expected 25% of last-30d
//
// trending_score: growth_rate × recent_volume
//   growth_rate = sold_last7d / sold_prev7d (or 2× if no prior sales)
//   multiplied by sold7d so single-sale spikes don't dominate
function computeScore(
  totalSold: number,
  stock: number,
  sold30d: number,
  sold7d: number,
  soldPrev7d: number,
) {
  const velocity = sold30d / 30
  const sellThrough = (totalSold + stock) > 0 ? (totalSold / (totalSold + stock)) * 100 : 0
  const volumeScore = Math.min(totalSold / 200, 1) * 100
  const recentGrowth = sold30d > 0 ? Math.min((sold7d / sold30d) * 4, 1) * 100 : 0

  const best_seller_score =
    velocity * 30 +
    sellThrough * 0.4 +
    volumeScore * 0.2 +
    recentGrowth * 0.1

  // Trending requires at least 1 recent sale; no-prior-sales products get 2× multiplier
  let trending_score = 0
  if (sold7d >= 1) {
    const growthRate = soldPrev7d > 0 ? sold7d / soldPrev7d : 2
    trending_score = growthRate * sold7d
  }

  return {
    best_seller_score: Math.round(best_seller_score * 100) / 100,
    trending_score: Math.round(trending_score * 100) / 100,
  }
}

export async function recalculateScores(productIds?: string[]) {
  let query = supabaseAdmin
    .from('products')
    .select('id, total_sold, stock_quantity, variant_stock')
    .eq('is_active', true)
  if (productIds?.length) query = query.in('id', productIds)
  const { data: products } = await query
  if (!products?.length) return

  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const d7  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000).toISOString()

  // Include processing + shipped — ZADII'S is COD-heavy; orders reach "delivered"
  // days after fulfilment, so waiting would stale all scores.
  // Query order_items directly — avoids scanning JSONB blobs on every order.
  // The join with orders for status filtering happens at DB level via PostgREST.
  const { data: recentOrders } = await supabaseAdmin
    .from('orders')
    .select('created_at, order_items(product_id, quantity)')
    .in('order_status', ['processing', 'shipped', 'delivered'])
    .gte('created_at', d30)

  const sold30d:    Record<string, number> = {}
  const sold7d:     Record<string, number> = {}
  const soldPrev7d: Record<string, number> = {}

  for (const order of (recentOrders || [])) {
    const inLast7 = order.created_at >= d7
    const inPrev7 = order.created_at >= d14 && order.created_at < d7
    for (const item of ((order.order_items || []) as { product_id: string; quantity: number }[])) {
      if (!item.product_id) continue
      sold30d[item.product_id] = (sold30d[item.product_id] || 0) + item.quantity
      if (inLast7) sold7d[item.product_id]     = (sold7d[item.product_id]     || 0) + item.quantity
      if (inPrev7) soldPrev7d[item.product_id] = (soldPrev7d[item.product_id] || 0) + item.quantity
    }
  }

  await Promise.all(
    (products as ProductRow[]).map(p => {
      const stock = getTotalStock(p)
      const scores = computeScore(
        p.total_sold || 0,
        stock,
        sold30d[p.id]    || 0,
        sold7d[p.id]     || 0,
        soldPrev7d[p.id] || 0,
      )
      return supabaseAdmin.from('products').update(scores).eq('id', p.id)
    })
  )
}

export async function incrementTotalSold(items: OrderItem[]) {
  const byProduct: Record<string, number> = {}
  for (const item of items) {
    if (item.product_id) byProduct[item.product_id] = (byProduct[item.product_id] || 0) + item.quantity
  }

  // Atomic: single UPDATE per product, no read-modify-write race condition.
  // Requires the increment_total_sold function in supabase/fixes-atomic-increment.sql.
  await Promise.all(
    Object.entries(byProduct).map(([pid, qty]) =>
      supabaseAdmin.rpc('increment_total_sold', { p_product_id: pid, p_quantity: qty })
    )
  )

  await recalculateScores(Object.keys(byProduct))
}
