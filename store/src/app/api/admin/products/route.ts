import { NextRequest, NextResponse, after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendBackInStockEmail } from '@/lib/email'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, sku, price, cost_price, images, stock_quantity, variant_stock, total_sold, is_new_arrival, is_bestseller, is_trending, best_seller_score, created_at, product_category')
    .eq('is_active', true)
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

function calcTotalStock(variantStock: Record<string, Record<string, number>>): number {
  if (!variantStock || Object.keys(variantStock).length === 0) return 0
  return Object.values(variantStock).reduce(
    (sum, sizeMap) => sum + Object.values(sizeMap).reduce((s, qty) => s + (typeof qty === 'number' ? qty : 0), 0),
    0
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const slug = toSlug(body.name)
  const variantStock = body.variant_stock as Record<string, Record<string, number>> | undefined
  const stockQuantity = variantStock && Object.keys(variantStock).length > 0
    ? calcTotalStock(variantStock)
    : body.stock_quantity
  const { data, error } = await supabaseAdmin
    .from('products')
    .insert([{ ...body, slug, stock_quantity: stockQuantity }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const { id, ...body } = await req.json()
  const variantStock = body.variant_stock as Record<string, Record<string, number>> | undefined
  if (variantStock && Object.keys(variantStock).length > 0) {
    body.stock_quantity = calcTotalStock(variantStock)
  }

  // Read old stock before updating (needed to detect 0 → positive transition)
  const newStock = body.stock_quantity as number | undefined
  let restockProduct: { name: string; slug: string; images: string[] } | null = null
  if (typeof newStock === 'number' && newStock > 0) {
    const { data: current } = await supabaseAdmin
      .from('products')
      .select('stock_quantity, name, slug, images')
      .eq('id', id)
      .single()
    if (current?.stock_quantity === 0) restockProduct = current
  }

  // Update product FIRST — response is never held hostage by email latency
  const { error } = await supabaseAdmin.from('products').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send back-in-stock emails after the response is returned (non-blocking)
  if (restockProduct) {
    const snap = restockProduct
    after(async () => {
      const { data: waitlist } = await supabaseAdmin
        .from('product_waitlist')
        .select('email')
        .eq('product_id', id)
        .is('notified_at', null)
      if (!waitlist?.length) return
      await Promise.all(
        waitlist.map(w => sendBackInStockEmail(w.email, {
          product_name:  snap.name,
          product_slug:  snap.slug,
          product_image: (snap.images as string[])?.[0],
        }))
      )
      await supabaseAdmin
        .from('product_waitlist')
        .update({ notified_at: new Date().toISOString() })
        .eq('product_id', id)
        .is('notified_at', null)
    })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('products').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
