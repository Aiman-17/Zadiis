import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { generateInvoice } from '@/lib/invoice'
import { sendCustomerOrderDelivered, sendOwnerPaymentReceived, sendCustomerOrderCancelled } from '@/lib/email'
import { incrementTotalSold } from '@/lib/scoring'
import type { OrderItem } from '@/types'

export async function PATCH(req: NextRequest) {
  try {
    const { id, customer_phone, customer_email, address } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const update: Record<string, unknown> = {}

    if (customer_phone !== undefined) {
      const clean = String(customer_phone).replace(/[\s\-]/g, '')
      if (!/^03[0-9]{9}$/.test(clean))
        return NextResponse.json({ error: 'Phone must be 11 digits starting with 03' }, { status: 400 })
      update.customer_phone = clean
    }
    if (customer_email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email))
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      update.customer_email = customer_email
      update.email_bounced = false
    }
    if (address !== undefined) update.address = address

    if (Object.keys(update).length === 0)
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

    const { error } = await supabaseAdmin.from('orders').update(update).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { data: order } = await supabaseAdmin
      .from('orders').select('payment_status').eq('id', id).single()
    if (!order || order.payment_status !== 'paid')
      return NextResponse.json({ error: 'Only paid orders can be deleted' }, { status: 400 })
    const { error } = await supabaseAdmin.from('orders').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    let orderData: {
      order_number: string
      customer_name: string
      customer_phone: string
      customer_email?: string | null
      total: number
      payment_method: string
      safepay_transaction_id?: string | null
    } | null = null

    const needsOrderData = order_status === 'delivered' || order_status === 'cancelled' || payment_status === 'paid'
    if (needsOrderData) {
      const { data } = await supabaseAdmin
        .from('orders')
        .select('order_number, customer_name, customer_phone, customer_email, total, payment_method, safepay_transaction_id, items')
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

    // Stamp action timestamps in a separate call — migration-safe (fails silently before columns exist).
    // Also clears timestamps on status reversal to prevent stale field inflation.
    if (order_status !== undefined) {
      void supabaseAdmin.from('orders').update({
        cancelled_at: order_status === 'cancelled' ? new Date().toISOString() : null,
        returned_at:  order_status === 'returned'  ? new Date().toISOString() : null,
      }).eq('id', id)
    }

    // Increment total_sold when delivered
    if (order_status === 'delivered' && orderData && 'items' in orderData && orderData.items) {
      void incrementTotalSold(orderData.items as OrderItem[])
    }

    // Auto-send cancellation email to customer
    if (order_status === 'cancelled' && orderData) {
      void sendCustomerOrderCancelled(orderData.customer_email, {
        order_number: orderData.order_number,
        customer_name: orderData.customer_name,
      })
    }

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
