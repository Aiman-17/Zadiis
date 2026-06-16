import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data } = await supabaseAdmin
    .from('delivery_zones')
    .select('*')
    .order('city')
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const { city, delivery_charge } = await req.json()
  if (!city || delivery_charge === undefined) {
    return NextResponse.json({ error: 'city and delivery_charge required' }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from('delivery_zones')
    .insert([{ city, delivery_charge: Number(delivery_charge) }])
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { id, ...body } = await req.json()
  const { error } = await supabaseAdmin.from('delivery_zones').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('delivery_zones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
