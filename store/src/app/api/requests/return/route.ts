import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import {
  sendOwnerReturnRequest,
  sendCustomerReturnConfirmation,
  sendOwnerExchangeRequest,
  sendCustomerExchangeConfirmation,
  RETURN_REASON_LABELS,
} from '@/lib/email'
import { notifyAdmin } from '@/lib/notifications'

const VALID_REASONS = new Set([
  'wrong_size',
  'defective_item',
  'wrong_item_sent',
  'changed_mind',
  'other',
  'exchange',
])

const RETURN_WINDOW_DAYS = 3
// Grandfather clause: orders delivered before delivered_at existed have no
// recorded delivery time. Fall back to the previous policy (days since order
// placement) for those specific orders only.
const LEGACY_WINDOW_DAYS = 7

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

    if (!order_number?.trim() || !customer_email?.trim() || !customer_name?.trim()) {
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
      .select('id, order_status, created_at, delivered_at, customer_email, customer_name, items')
      .eq('order_number', normalised)
      .single()

    if (!order) {
      return NextResponse.json({
        error: 'We could not find an order with that order number. Please double-check and try again, or reach out to us on WhatsApp for assistance.',
        code: 'NOT_FOUND',
      }, { status: 404 })
    }

    const emailMatches = order.customer_email?.trim().toLowerCase() === customer_email.trim().toLowerCase()
    const nameMatches  = order.customer_name?.trim().toLowerCase() === customer_name.trim().toLowerCase()
    if (!emailMatches || !nameMatches) {
      return NextResponse.json({
        error: 'The name and email you entered do not match our records for this order. Please double-check and try again, or reach out to us on WhatsApp for assistance.',
        code: 'IDENTITY_MISMATCH',
      }, { status: 422 })
    }

    if (order.order_status === 'cancelled') {
      return NextResponse.json({
        error: 'This order was cancelled and is not eligible for a return. Please contact us on WhatsApp if you have further questions.',
        code: 'CANCELLED',
      }, { status: 422 })
    }

    if (order.order_status === 'returned') {
      return NextResponse.json({
        error: 'A return has already been processed for this order.',
        code: 'ALREADY_RETURNED',
      }, { status: 422 })
    }

    if (order.order_status !== 'delivered') {
      return NextResponse.json({
        error: 'This order has not been delivered yet, so there is nothing to return or exchange. Please wait until your order arrives.',
        code: 'NOT_DELIVERED',
      }, { status: 422 })
    }

    if (order.delivered_at) {
      const daysSinceDelivery = (Date.now() - new Date(order.delivered_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceDelivery > RETURN_WINDOW_DAYS) {
        return NextResponse.json({
          error: 'Your return window has passed. Our policy allows returns and exchanges within 3 days of your order being delivered. We understand this may be frustrating — please reach out to us on WhatsApp and we\'ll do our best to assist you.',
          code: 'EXPIRED',
        }, { status: 422 })
      }
    } else {
      // Legacy order delivered before we started recording delivery time.
      const daysSinceOrder = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceOrder > LEGACY_WINDOW_DAYS) {
        return NextResponse.json({
          error: 'Your return window has passed. Our policy allows returns and exchanges within 3 days of your order being delivered. We understand this may be frustrating — please reach out to us on WhatsApp and we\'ll do our best to assist you.',
          code: 'EXPIRED',
        }, { status: 422 })
      }
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
        sendOwnerExchangeRequest({ order_number: normalised, customer_email, customer_name, exchange_details, notes, items: order.items }),
        sendCustomerExchangeConfirmation(customer_email, { order_number: normalised, customer_name }),
      ])
      await notifyAdmin(
        'exchange_request',
        order.id,
        `${customer_name || 'A customer'} (${customer_email}) requested an exchange on order #${normalised} — ${exchange_details.trim()}`,
      )
    } else {
      await Promise.allSettled([
        sendOwnerReturnRequest({ order_number: normalised, customer_email, customer_name, reason, notes, items: order.items }),
        sendCustomerReturnConfirmation(customer_email, { order_number: normalised, customer_name }),
      ])
      const reasonLabel = RETURN_REASON_LABELS[reason] || reason
      await notifyAdmin(
        'return_request',
        order.id,
        `${customer_name || 'A customer'} (${customer_email}) requested a return on order #${normalised} — ${reasonLabel}`,
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
