import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { OrderItem } from '@/types'

const RETURN_REASONS: Record<string, boolean> = {
  wrong_size:      true,
  defective_item:  true,
  changed_mind:    true,
  wrong_item_sent: true,
  other:           true,
}

export async function POST(req: NextRequest) {
  try {
    const { id, reason, notes } = await req.json()
    if (!id || !reason || !RETURN_REASONS[reason]) {
      return NextResponse.json({ error: 'id and valid reason are required' }, { status: 400 })
    }

    const { data: order, error: fetchErr } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, order_status, items')
      .eq('id', id)
      .single()

    if (fetchErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    if (order.order_status === 'returned') {
      return NextResponse.json({ error: 'Order is already marked as returned' }, { status: 409 })
    }
    if (order.order_status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot return a cancelled order' }, { status: 409 })
    }

    const { error: updateErr } = await supabaseAdmin
      .from('orders')
      .update({ order_status: 'returned', return_reason: reason })
      .eq('id', id)
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Migration-safe timestamps (fail silently before columns exist).
    // Clears cancelled_at in case order was previously cancelled before being returned.
    void supabaseAdmin.from('orders').update({ cancelled_at: null, returned_at: new Date().toISOString() }).eq('id', id)

    const items = (order.items || []) as OrderItem[]
    const movements = []

    for (const item of items) {
      if (!item.product_id) continue

      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single()
      if (prod) {
        await supabaseAdmin
          .from('products')
          .update({ stock_quantity: prod.stock_quantity + item.quantity })
          .eq('id', item.product_id)
      }

      movements.push({
        product_id: item.product_id,
        delta:      item.quantity,
        reason:     'return' as const,
        order_id:   id,
        notes:      notes || reason,
      })
    }

    if (movements.length > 0) {
      await supabaseAdmin.from('stock_movements').insert(movements)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Return API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
