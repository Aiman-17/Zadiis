import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data } = await supabaseAdmin.from('store_settings').select('key, value')
  const settings: Record<string, string> = {}
  ;(data || []).forEach(({ key, value }) => { settings[key] = value })
  return NextResponse.json(settings)
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json()
  const { error } = await supabaseAdmin
    .from('store_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
