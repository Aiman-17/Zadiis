import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM || 'ZADIIS <orders@zadiis.com.pk>'

export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (!process.env.RESEND_WEBHOOK_SECRET || secret !== process.env.RESEND_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  if (body.type !== 'email.bounced') {
    return NextResponse.json({ received: true })
  }

  const bouncedEmail: string | undefined = body.data?.to?.[0]
  if (!bouncedEmail) return NextResponse.json({ received: true })

  await supabaseAdmin
    .from('orders')
    .update({ email_bounced: true })
    .eq('customer_email', bouncedEmail)

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('order_number, customer_name, customer_phone')
    .eq('customer_email', bouncedEmail)
    .order('created_at', { ascending: false })
    .limit(5)

  if (orders && orders.length > 0) {
    const orderList = orders.map(o => `${o.order_number} (${o.customer_name})`).join(', ')
    const phone = orders[0].customer_phone
    try {
      await resend.emails.send({
        from: FROM,
        to: process.env.OWNER_EMAIL!,
        subject: `⚠️ Email bounced — Customer unreachable — ${orderList}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <h2 style="color:#1C1C1C;font-family:Georgia,serif;border-bottom:2px solid #EF4444;padding-bottom:8px">
              ⚠️ Customer Email Bounced
            </h2>
            <p><strong>Bounced email:</strong> ${bouncedEmail}</p>
            <p><strong>Phone on file:</strong> ${phone}</p>
            <p><strong>Affected orders:</strong> ${orderList}</p>
            <p style="color:#6B7280;font-size:13px;margin-top:16px">
              These orders are flagged with a warning badge in your admin panel.<br>
              Please call or WhatsApp the customer at <strong>${phone}</strong> to get their correct email,
              then update it via Admin → Orders → Edit Contact.
            </p>
          </div>
        `,
      })
    } catch { }
  }

  return NextResponse.json({ received: true })
}
