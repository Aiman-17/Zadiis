// Auth note: admin cookie validation for /api/admin/* routes is NOT enforced by middleware
// (store/src/proxy.ts only covers /admin page routes). Consider adding an in-route
// cookie check mirroring the pattern in store/src/proxy.ts, or extending the matcher
// to cover /api/admin/:path* to close this gap.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { title, description, is_active, delivery_charge_override, starts_at, ends_at } = body
  const { error } = await supabaseAdmin
    .from('sales')
    .update({ title, description: description || null, is_active: is_active ?? false, delivery_charge_override: delivery_charge_override ?? null, starts_at: starts_at || null, ends_at: ends_at || null })
    .eq('id', id)
  if (error) {
    if (error.message.includes('unique') || error.code === '23505') {
      return NextResponse.json({ error: 'Another sale is already active. Deactivate it first.' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('sales').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
