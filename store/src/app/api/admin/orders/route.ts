import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateInvoice } from '@/lib/invoice'
import { sendCustomerOrderDelivered, sendOwnerPaymentReceived } from '@/lib/email'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, order_status, payment_status, cancellation_reason, is_archived } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const update: Record<string, unknown> = {}
    if (order_status !== undefined) update.order_status = order_status
    if (payment_status !== undefined) {
      update.payment_status = payment_status
      if (payment_status === 'paid') update.payment_verified_at = new Date().toISOString()
    }
    if (cancellation_reason !== undefined) update.cancellation_reason = cancellation_reason
    if (is_archived !== undefined) update.is_archived = is_archived

    // Fetch order for email triggers only when needed
    let orderData: {
      order_number: string
      customer_name: string
      customer_phone: string
      customer_email?: string | null
      total: number
      payment_method: string
      safepay_transaction_id?: string | null
    } | null = null

    const needsOrderData = order_status === 'delivered' || payment_status === 'paid'
    if (needsOrderData) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('order_number, customer_name, customer_phone, customer_email, total, payment_method, safepay_transaction_id')
        .eq('id', id)
        .single()
      orderData = data
    }

    // Auto-pay COD when marked delivered
    if (order_status === 'delivered' && orderData?.payment_method === 'cod') {
      update.payment_status = 'paid'
      update.payment_verified_at = new Date().toISOString()
    }

    const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Post-update side effects — skip for cancelled orders
    if (order_status !== 'cancelled') {
      const finalPaymentPaid = update.payment_status === 'paid' || payment_status === 'paid'

      if (finalPaymentPaid) {
        await generateInvoice(id)
      }

      if (order_status === 'delivered' && orderData) {
        if (orderData.payment_method === 'cod') {
          await sendOwnerPaymentReceived({
            order_number: orderData.order_number,
            customer_name: orderData.customer_name,
            customer_phone: orderData.customer_phone,
            total: orderData.total,
            payment_method: orderData.payment_method,
          })
        }
        await sendCustomerOrderDelivered(orderData.customer_email, {
          order_number: orderData.order_number,
          customer_name: orderData.customer_name,
          total: orderData.total,
        })
      }

      if (payment_status === 'paid' && orderData) {
        await sendOwnerPaymentReceived({
          order_number: orderData.order_number,
          customer_name: orderData.customer_name,
          customer_phone: orderData.customer_phone,
          total: orderData.total,
          payment_method: orderData.payment_method,
          safepay_transaction_id: orderData.safepay_transaction_id,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('Admin orders PUT error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
