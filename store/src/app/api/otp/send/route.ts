import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendOtpEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })

    // Rate limit: one OTP per 60 seconds per email
    const { data: recent } = await supabaseAdmin
      .from('email_otps')
      .select('created_at')
      .eq('email', email)
      .gte('created_at', new Date(Date.now() - 60_000).toISOString())
      .limit(1)

    if (recent && recent.length > 0)
      return NextResponse.json({ error: 'A code was already sent. Please wait 60 seconds before requesting a new one.' }, { status: 429 })

    // Delete any existing OTPs for this email
    await supabaseAdmin.from('email_otps').delete().eq('email', email)

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString()

    await supabaseAdmin.from('email_otps').insert({ email, otp, expires_at: expiresAt })

    await sendOtpEmail(email, otp)

    return NextResponse.json({ sent: true })
  } catch {
    return NextResponse.json({ error: 'Failed to send code. Please try again.' }, { status: 500 })
  }
}
