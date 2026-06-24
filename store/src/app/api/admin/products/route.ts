import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('products')
    .select('id, name, slug, price, images')
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
  const { error } = await supabaseAdmin.from('products').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('products').update({ is_active: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
