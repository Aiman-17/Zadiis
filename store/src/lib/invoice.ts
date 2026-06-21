import { supabaseAdmin } from '@/lib/supabase/server'

async function nextInvoiceNumber(): Promise<string> {
  const { data, error } = await supabaseAdmin.rpc('get_next_invoice_number')
  if (error || !data) {
    console.error('[invoice] nextInvoiceNumber RPC failed:', error?.message)
    return `INV-${Date.now()}`
  }
  return data as string
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
