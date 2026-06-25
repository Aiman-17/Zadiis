import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOwnerStockConflict } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { items } = await req.json() as {
      items: Array<{ product_id: string; product_name: string; color?: string; size?: string; quantity: number }>
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ unavailable: [] })
    }

    const ids = items.map(i => i.product_id)
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, stock_quantity, variant_stock, name')
      .in('id', ids)

    const productMap = new Map((products || []).map(p => [p.id, p]))
    const unavailable: typeof items = []

    for (const item of items) {
      const product = productMap.get(item.product_id)
      if (!product || product.stock_quantity < item.quantity) {
        unavailable.push(item)
        continue
      }
      const vs = product.variant_stock as Record<string, Record<string, number>> | null
      if (vs && Object.keys(vs).length > 0) {
        const c = item.color || '_'
        const s = item.size || '_'
        const variantQty = vs?.[c]?.[s]
        if (variantQty !== undefined && variantQty < item.quantity) {
          unavailable.push(item)
        }
      }
    }

    if (unavailable.length > 0) {
      const names = unavailable.map(i => i.product_name).join(', ')
      void sendOwnerStockConflict({ product_names: names })
    }

    return NextResponse.json({ unavailable })
  } catch (err) {
    console.error('cart validate error:', err)
    return NextResponse.json({ unavailable: [] })
  }
}
