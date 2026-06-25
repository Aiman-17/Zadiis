import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(req: NextRequest) {
  try {
    const { id, cod_status } = await req.json()
    if (!id || !['received', 'lost', 'pending'].includes(cod_status)) {
      return NextResponse.json({ error: 'id and valid cod_status required' }, { status: 400 })
    }
    const update: Record<string, unknown> = { cod_status }
    if (cod_status === 'received') update.cod_collected_at = new Date().toISOString()
    if (cod_status === 'pending')  update.cod_collected_at = null

    const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('COD status error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
