import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { recalculateScores } from '@/lib/scoring'
import type { OrderItem } from '@/types'

// POST /api/admin/scoring
// Retroactive seeding: calculates total_sold from all historical delivered orders,
// then recomputes best_seller_score and trending_score for every product.
export async function POST() {
  try {
    const { data: orders, error } = await supabaseAdmin
      .from('orders')
      .select('items')
      .eq('order_status', 'delivered')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Aggregate total units sold per product across all delivered orders
    const totalSold: Record<string, number> = {}
    for (const order of (orders || [])) {
      for (const item of ((order.items || []) as OrderItem[])) {
        if (item.product_id) {
          totalSold[item.product_id] = (totalSold[item.product_id] || 0) + item.quantity
        }
      }
    }

    // Write total_sold to each product
    await Promise.all(
      Object.entries(totalSold).map(([id, count]) =>
        supabaseAdmin.from('products').update({ total_sold: count }).eq('id', id)
      )
    )

    // Recompute best_seller_score + trending_score for all products
    await recalculateScores()

    return NextResponse.json({
      success: true,
      productsUpdated: Object.keys(totalSold).length,
      totalOrdersProcessed: orders?.length ?? 0,
    })
  } catch (e) {
    console.error('Scoring recalculate error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
