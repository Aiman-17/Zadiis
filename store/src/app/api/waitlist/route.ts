import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { product_id, email, phone } = await req.json()
  if (!product_id || !email) {
    return NextResponse.json({ error: 'product_id and email are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_waitlist')
    .upsert(
      { product_id, email: email.trim().toLowerCase(), phone: phone?.trim() || null },
      { onConflict: 'product_id,email', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
