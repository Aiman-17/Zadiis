import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOwnerCancellationRequest, sendCustomerCancellationConfirmation } from '@/lib/email'

const VALID_REASONS = new Set([
  'changed_mind',
  'ordered_by_mistake',
  'found_better_price',
  'delivery_too_slow',
  'other',
])

export async function POST(req: NextRequest) {
  try {
    const { order_number, customer_email, customer_name, reason, notes } = await req.json()

    if (!order_number?.trim() || !customer_email?.trim() || !reason || !VALID_REASONS.has(reason)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalised = order_number.trim().toUpperCase()

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

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
