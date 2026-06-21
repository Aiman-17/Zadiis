import { supabaseAdmin } from '@/lib/supabase/server'

async function nextInvoiceNumber(): Promise<string> {
  const { data } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .order('generated_at', { ascending: false })
    .limit(1)
    .single()
  let next = 1001
  if (data?.invoice_number) {
    const match = (data.invoice_number as string).match(/INV-(\d+)/)
    if (match) next = parseInt(match[1]) + 1
  }
  return `INV-${next}`
}

export async function generateInvoice(orderId: string): Promise<string | null> {
  const { data: existing } = await supabaseAdmin
    .from('invoices')
    .select('invoice_number')
    .eq('order_id', orderId)
    .single()
  if (existing?.invoice_number) return existing.invoice_number

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('total')
    .eq('id', orderId)
    .single()
  if (!order) return null

  const invoice_number = await nextInvoiceNumber()

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert([{ invoice_number, order_id: orderId, amount: order.total }])
    .select('invoice_number')
    .single()

  if (error) {
    console.error('[invoice] generateInvoice failed:', error.message)
    return null
  }
  return invoice?.invoice_number ?? null
}
