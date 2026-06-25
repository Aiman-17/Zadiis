import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const [cancelRes, returnRes] = await Promise.all([
      supabaseAdmin
        .from('cancellation_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('return_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
    return NextResponse.json({
      cancellations: cancelRes.data || [],
      returns: returnRes.data || [],
    })
  } catch {
    return NextResponse.json({ cancellations: [], returns: [] })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, type } = await req.json()
    if (!id || !type) return NextResponse.json({ error: 'id and type required' }, { status: 400 })
    const table = type === 'return' ? 'return_requests' : 'cancellation_requests'
    const { error } = await supabaseAdmin.from(table).update({ status: 'resolved' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
