import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('email_otps')
      .select('*')
      .eq('email', email)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!data)
      return NextResponse.json({ error: 'Code expired. Please request a new one.' }, { status: 400 })

    if (data.attempts >= 5)
      return NextResponse.json({ error: 'Too many attempts. Please request a new code.' }, { status: 400 })

    await supabaseAdmin.from('email_otps').update({ attempts: data.attempts + 1 }).eq('id', data.id)

    if (data.otp !== String(otp))
      return NextResponse.json({ error: 'Incorrect code. Please try again.' }, { status: 400 })

    await supabaseAdmin.from('email_otps').update({ verified: true }).eq('id', data.id)

    return NextResponse.json({ verified: true })
  } catch {
    return NextResponse.json({ error: 'Verification failed. Please try again.' }, { status: 500 })
  }
}
