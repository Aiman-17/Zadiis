import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOwnerCancellationRequest, sendCustomerCancellationConfirmation, CANCEL_REASON_LABELS } from '@/lib/email'
import { notifyAdmin } from '@/lib/notifications'

const VALID_REASONS = new Set([
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
])

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  try {
    const { data: cancelSetting } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'cancellations_enabled')
      .maybeSingle()
    if (cancelSetting?.value === 'false') {
      return NextResponse.json({
        error: 'Self-service cancellations are currently unavailable. Please reach out to us on WhatsApp and our team will help you right away.',
        code: 'CANCELLATIONS_DISABLED',
      }, { status: 403 })
    }

    const { order_number, customer_email, customer_name, reason, notes } = await req.json()

    if (!order_number?.trim() || !customer_email?.trim() || !customer_name?.trim() || !reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalised = order_number.trim().toUpperCase()

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, order_status, created_at, customer_email, customer_name')
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
        error: 'This order has already been cancelled.',
        code: 'ALREADY_CANCELLED',
      }, { status: 422 })
    }

    if (order.order_status === 'delivered') {
      return NextResponse.json({
        error: 'This order has already been delivered and can no longer be cancelled. If there is an issue with your order, please submit a return or exchange request instead.',
        code: 'ALREADY_DELIVERED',
      }, { status: 422 })
    }

    const msSinceOrder = Date.now() - new Date(order.created_at).getTime()
    if (msSinceOrder > CANCEL_WINDOW_MS) {
      return NextResponse.json({
        error: 'Your cancellation window has passed. Our policy only allows cancellations within 24 hours of placing your order. We understand this may be frustrating — please reach out to us on WhatsApp and we\'ll do our best to assist you.',
        code: 'EXPIRED',
      }, { status: 422 })
    }

    const { error } = await supabaseAdmin.from('cancellation_requests').insert({
      order_number:   normalised,
      customer_email: customer_email.trim().toLowerCase(),
      customer_name:  customer_name?.trim() || null,
      reason,
      notes: notes?.trim() || null,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await Promise.allSettled([
      sendOwnerCancellationRequest({ order_number: normalised, customer_email, customer_name, reason, notes }),
      sendCustomerCancellationConfirmation(customer_email, { order_number: normalised, customer_name }),
    ])
    const reasonLabel = CANCEL_REASON_LABELS[reason] || reason
    await notifyAdmin(
      'cancellation_request',
      order.id,
      `${customer_name || 'A customer'} (${customer_email}) requested to cancel order #${normalised} — ${reasonLabel}`,
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
