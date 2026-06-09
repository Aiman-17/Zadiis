import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(req: NextRequest) {
  const { id, order_status } = await req.json()
  const { error } = await supabaseAdmin.from('orders').update({ order_status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
