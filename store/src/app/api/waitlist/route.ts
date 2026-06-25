import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// IP-based rate limiting: max 3 submissions per IP per hour
const ipMap = new Map<string, { count: number; reset: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipMap.get(ip)
  if (!entry || now > entry.reset) {
    ipMap.set(ip, { count: 1, reset: now + 60 * 60 * 1000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  const { product_id, email, phone } = await req.json()
  if (!product_id || !email) {
    return NextResponse.json({ error: 'product_id and email are required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('product_waitlist')
    .upsert(
      { product_id, email: email.trim().toLowerCase(), phone: phone?.trim() || null },
      { onConflict: 'product_id,email', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
