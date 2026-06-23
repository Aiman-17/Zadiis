import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sales')
    .select('*, sale_products(*, products(id, name, slug, price, images))')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { title, description, is_active, delivery_charge_override, starts_at, ends_at } = body
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  const { data, error } = await supabaseAdmin
    .from('sales')
    .insert([{ title, description: description || null, is_active: is_active ?? false, delivery_charge_override: delivery_charge_override ?? null, starts_at: starts_at || null, ends_at: ends_at || null }])
    .select()
    .single()
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return NextResponse.json({ error: 'Another sale is already active. Deactivate it first.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
