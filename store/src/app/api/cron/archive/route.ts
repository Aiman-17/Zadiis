import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// Auto-archive products that have been out of stock for 60+ days with no sales.
// Called by Vercel Cron at 3am UTC daily.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Products that are active but have zero stock
  const { data: zeroStock } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('is_active', true)
    .eq('stock_quantity', 0)

  if (!zeroStock?.length) {
    return NextResponse.json({ archived: 0, message: 'No zero-stock active products' })
  }

  // Find recently sold product IDs using the relational order_items table —
  // avoids scanning JSONB blobs across potentially thousands of orders.
  const d60 = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentOrderIds } = await supabaseAdmin
    .from('orders')
    .select('id')
    .in('order_status', ['processing', 'shipped', 'delivered'])
    .gte('created_at', d60)

  const recentlySold = new Set<string>()
  const orderIds = (recentOrderIds || []).map((o: { id: string }) => o.id)

  if (orderIds.length > 0) {
    const { data: soldItems } = await supabaseAdmin
      .from('order_items')
      .select('product_id')
      .in('order_id', orderIds)
    for (const item of (soldItems || [])) {
      if (item.product_id) recentlySold.add(item.product_id)
    }
  }

  // Only archive products that have had no sales at all in 60 days
  const toArchive = zeroStock.filter((p: { id: string }) => !recentlySold.has(p.id))
  if (!toArchive.length) {
    return NextResponse.json({ archived: 0, message: 'All zero-stock products have recent sales — keeping active' })
  }

  await supabaseAdmin
    .from('products')
    .update({ is_active: false })
    .in('id', toArchive.map((p: { id: string }) => p.id))

  return NextResponse.json({
    archived: toArchive.length,
    ids: toArchive.map((p: { id: string }) => p.id),
    timestamp: new Date().toISOString(),
  })
}
