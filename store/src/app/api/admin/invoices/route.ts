import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      amount,
      generated_at,
      orders (
        order_number,
        customer_name,
        customer_phone,
        payment_method
      )
    `)
    .order('generated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
