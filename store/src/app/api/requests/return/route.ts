import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  sendOwnerReturnRequest,
  sendCustomerReturnConfirmation,
  sendOwnerExchangeRequest,
  sendCustomerExchangeConfirmation,
} from '@/lib/email'

const VALID_REASONS = new Set([
  'wrong_size',
  'defective_item',
  'wrong_item_sent',
  'changed_mind',
  'other',
  'exchange',
])

export async function POST(req: NextRequest) {
  try {
    const {
      order_number,
      customer_email,
      customer_name,
      reason,
      notes,
      request_type = 'return',
      exchange_details,
    } = await req.json()

    const isExchange = request_type === 'exchange'

    if (!order_number?.trim() || !customer_email?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (isExchange && !exchange_details?.trim()) {
      return NextResponse.json({ error: 'Please describe what you would like instead' }, { status: 400 })
    }

    if (!isExchange && (!reason || !VALID_REASONS.has(reason))) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalised = order_number.trim().toUpperCase()

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, order_status, created_at')
      .eq('order_number', normalised)
      .single()

    if (!order) {
      return NextResponse.json({
        error: 'We could not find an order with that order number. Please double-check and try again, or reach out to us on WhatsApp for assistance.',
        code: 'NOT_FOUND',
      }, { status: 404 })
    }

    const daysSince = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSince > 7) {
      return NextResponse.json({
        error: 'Your return window has passed. Our policy allows returns within 7 days of placing your order. We understand this may be frustrating — please reach out to us on WhatsApp and we\'ll do our best to assist you.',
        code: 'EXPIRED',
      }, { status: 422 })
    }

    if (order.order_status === 'cancelled') {
      return NextResponse.json({
        error: 'This order was cancelled and is not eligible for a return. Please contact us on WhatsApp if you have further questions.',
        code: 'CANCELLED',
      }, { status: 422 })
    }

    const { error } = await supabaseAdmin.from('return_requests').insert({
      order_number:     normalised,
      customer_email:   customer_email.trim().toLowerCase(),
      customer_name:    customer_name?.trim() || null,
      reason:           isExchange ? 'exchange' : reason,
      notes:            notes?.trim() || null,
      request_type,
      exchange_details: isExchange ? exchange_details.trim() : null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (isExchange) {
      await Promise.allSettled([
        sendOwnerExchangeRequest({ order_number: normalised, customer_email, customer_name, exchange_details, notes }),
        sendCustomerExchangeConfirmation(customer_email, { order_number: normalised, customer_name }),
      ])
    } else {
      await Promise.allSettled([
        sendOwnerReturnRequest({ order_number: normalised, customer_email, customer_name, reason, notes }),
        sendCustomerReturnConfirmation(customer_email, { order_number: normalised, customer_name }),
      ])
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
