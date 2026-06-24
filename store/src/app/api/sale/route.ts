import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data: sale, error } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(product_id, sale_price, products(id, name, slug, price, images, colors, sizes, stock_quantity, variant_stock, is_bestseller, sku, is_active, created_at, category_id, description))')
    .eq('is_active', true)
    .single()

  if (error || !sale) return NextResponse.json({ sale: null }, { status: 200 })
  return NextResponse.json({ sale })
}
