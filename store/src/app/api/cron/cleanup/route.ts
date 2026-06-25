import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  await Promise.allSettled([
    supabaseAdmin.from('cancellation_requests').delete().lt('created_at', cutoff),
    supabaseAdmin.from('return_requests').delete().lt('created_at', cutoff),
  ])

  return NextResponse.json({ success: true, cutoff })
}
