import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendCustomerOrderDelivered, sendOwnerPaymentReceived } from '@/lib/email'
import { generateInvoice } from '@/lib/invoice'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function PUT(req: NextRequest) {
  const { id, order_status, payment_status } = await req.json()

  const update: Record<string, unknown> = {}
  if (order_status) update.order_status = order_status
  if (payment_status) {
    update.payment_status = payment_status
    if (payment_status === 'paid') update.payment_verified_at = new Date().toISOString()
  }

  // Fetch order data needed for emails and COD auto-pay logic
  let fetchedOrder: {
    order_number: string; customer_name: string; customer_phone: string
    customer_email?: string; total: number; payment_method: string; items: unknown
  } | null = null

  if (order_status === 'delivered') {
    const { data } = await supabaseAdmin
      .from('orders')
      .select('order_number, customer_name, customer_phone, customer_email, total, payment_method, items')
      .eq('id', id)
      .single()
    fetchedOrder = data

    if (fetchedOrder?.payment_method === 'cod') {
      update.payment_status = 'paid'
      update.payment_verified_at = new Date().toISOString()
    }
  }

  // DB update first — if this fails, no emails are sent
  const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate invoice if order was just paid (covers COD auto-pay + manual Mark Paid)
  if (update.payment_status === 'paid') {
    await generateInvoice(id)
  }

  // Send emails AFTER successful DB update
  if (order_status === 'delivered' && fetchedOrder) {
    if (fetchedOrder.payment_method === 'cod') {
      await sendOwnerPaymentReceived({
        order_number: fetchedOrder.order_number,
        customer_name: fetchedOrder.customer_name,
        customer_phone: fetchedOrder.customer_phone,
        total: fetchedOrder.total,
        payment_method: 'cod',
      })
    }
    await sendCustomerOrderDelivered(fetchedOrder.customer_email, {
      order_number: fetchedOrder.order_number,
      customer_name: fetchedOrder.customer_name,
      total: fetchedOrder.total,
    })
  }

  return NextResponse.json({ success: true })
}
