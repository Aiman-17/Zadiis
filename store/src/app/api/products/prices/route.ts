import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { ids } = await req.json() as { ids: string[] }
  if (!Array.isArray(ids) || ids.length === 0) return NextResponse.json([])
  const { data } = await supabaseAdmin.from('products').select('id, price').in('id', ids)
  return NextResponse.json(data || [])
}
