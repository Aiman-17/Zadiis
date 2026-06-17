import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
