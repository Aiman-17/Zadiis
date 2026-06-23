import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { product_id, sale_price } = await req.json()
  if (!product_id || sale_price == null) return NextResponse.json({ error: 'product_id and sale_price required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('sale_products')
    .upsert([{ sale_id: id, product_id, sale_price }], { onConflict: 'sale_id,product_id' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { product_id } = await req.json()
  const { error } = await supabaseAdmin
    .from('sale_products')
    .delete()
    .eq('sale_id', id)
    .eq('product_id', product_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
