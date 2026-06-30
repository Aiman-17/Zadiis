import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('sales')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('ends_at', new Date().toISOString())
    .not('ends_at', 'is', null)
    .select('id, title')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deactivated: data?.length ?? 0, sales: data })
}
