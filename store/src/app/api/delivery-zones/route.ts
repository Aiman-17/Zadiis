import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const [{ data: zones }, { data: settings }, { data: activeSale }] = await Promise.all([
      supabaseAdmin.from('delivery_zones').select('id, city, delivery_charge').eq('is_active', true).order('city'),
      supabaseAdmin.from('store_settings').select('key, value'),
      supabaseAdmin.from('sales').select('id, delivery_charge_override').eq('is_active', true).single(),
    ])
    const cod_enabled = settings?.find(s => s.key === 'cod_enabled')?.value === 'true'
    return NextResponse.json({
      zones: zones || [],
      cod_enabled,
      sale_active: !!activeSale,
      sale_delivery_override: activeSale?.delivery_charge_override ?? null,
    })
  } catch {
    return NextResponse.json({ zones: [], cod_enabled: false, sale_active: false, sale_delivery_override: null })
  }
}
