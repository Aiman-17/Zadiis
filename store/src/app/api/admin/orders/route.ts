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

  // Build update object — only include fields that were provided
  const update: Record<string, unknown> = {}
  if (order_status) update.order_status = order_status
  if (payment_status) {
    update.payment_status = payment_status
    if (payment_status === 'paid') update.payment_verified_at = new Date().toISOString()
  }

  // When marking as delivered, fetch the order to check payment method + send emails
  if (order_status === 'delivered') {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_number, customer_name, customer_phone, customer_email, total, payment_method, items')
      .eq('id', id)
      .single()

    if (order) {
      // COD: money collected at door — auto-mark paid
      if (order.payment_method === 'cod') {
        update.payment_status = 'paid'
        update.payment_verified_at = new Date().toISOString()
        await sendOwnerPaymentReceived({
          order_number: order.order_number,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          total: order.total,
          payment_method: 'cod',
        })
      }

      // Send delivery email to customer for all payment methods
      await sendCustomerOrderDelivered(order.customer_email, {
        order_number: order.order_number,
        customer_name: order.customer_name,
        total: order.total,
      })
    }
  }

  const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Generate invoice if order was just paid (covers COD auto-pay + manual Mark Paid)
  if (update.payment_status === 'paid') {
    await generateInvoice(id)
  }

  return NextResponse.json({ success: true })
}
