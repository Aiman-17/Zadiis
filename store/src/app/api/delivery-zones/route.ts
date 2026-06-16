import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const [{ data: zones }, { data: settings }] = await Promise.all([
      supabaseAdmin.from('delivery_zones').select('id, city, delivery_charge').eq('is_active', true).order('city'),
      supabaseAdmin.from('store_settings').select('key, value'),
    ])
    const cod_enabled = settings?.find(s => s.key === 'cod_enabled')?.value === 'true'
    return NextResponse.json({ zones: zones || [], cod_enabled })
  } catch {
    return NextResponse.json({ zones: [], cod_enabled: false })
  }
}
