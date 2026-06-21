export const dynamic = 'force-dynamic'
import { supabaseAdmin } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import PrintButton from './PrintButton'
import type { OrderItem } from '@/types'

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: inv } = await supabaseAdmin
    .from('invoices')
    .select(`
      invoice_number,
      amount,
      generated_at,
      orders (
        order_number,
        customer_name,
        customer_phone,
        customer_email,
        address,
        city,
        items,
        subtotal,
        delivery_charge,
        total,
        payment_method,
        payment_status,
        payment_verified_at,
        safepay_transaction_id,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (!inv || !inv.orders) notFound()

  const order = inv.orders as unknown as {
    order_number: string; customer_name: string; customer_phone: string
    customer_email?: string; address: string; city: string; items: OrderItem[]
    subtotal: number; delivery_charge: number; total: number
    payment_method: string; payment_status: string
    payment_verified_at?: string; safepay_transaction_id?: string; created_at: string
  }

  const paidDate = inv.generated_at
    ? new Date(inv.generated_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'
  const orderDate = new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 1.5cm; }
        }
        body { font-family: Arial, sans-serif; background: white; }
      `}</style>

      {/* Print controls — hidden when printing */}
      <div className="no-print flex items-center gap-4 p-4 border-b" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
        <span className="text-sm font-medium">Invoice {inv.invoice_number}</span>
        <PrintButton />
        <a href="/admin/invoices" className="text-sm" style={{ color: '#6B7280' }}>← Back to Invoices</a>
      </div>

      {/* Invoice document */}
      <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, paddingBottom: 16, borderBottom: '2px solid #A68B6E' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontFamily: 'Georgia, serif', color: '#1C1C1C', letterSpacing: 3 }}>ZADIIS</h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A68B6E', letterSpacing: 1 }}>AUTHENTIC PAKISTANI FASHION</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>zadiis.com.pk</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>orders@zadiis.com.pk</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#1C1C1C' }}>INVOICE</p>
            <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 'bold', color: '#A68B6E', fontFamily: 'Georgia, serif' }}>{inv.invoice_number}</p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6B7280' }}>Order: {order.order_number}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Order Date: {orderDate}</p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6B7280' }}>Invoice Date: {paidDate}</p>
          </div>
        </div>

        {/* Bill to */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 }}>Bill To</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 'bold', color: '#1C1C1C' }}>{order.customer_name}</p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.customer_phone}</p>
          {order.customer_email && <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.customer_email}</p>}
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#4B5563' }}>{order.address}, {order.city}</p>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
          <thead>
            <tr style={{ backgroundColor: '#FAF8F5', borderBottom: '2px solid #E8DDD4' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Item</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Size</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Color</th>
              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 12, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(order.items as OrderItem[]).map((item, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#9CA3AF' }}>{i + 1}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#1C1C1C' }}>
                  {item.product_name}
                  {item.sku && <span style={{ display: 'block', fontSize: 11, color: '#A68B6E' }}>{item.sku}</span>}
                </td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.size}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.color}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#4B5563', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '10px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right', fontWeight: 500 }}>
                  PKR {(item.price * item.quantity).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <table style={{ minWidth: 260 }}>
            <tbody>
              <tr>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>Subtotal</td>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right' }}>PKR {Number(order.subtotal).toLocaleString()}</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#6B7280' }}>Delivery</td>
                <td style={{ padding: '6px 12px', fontSize: 13, color: '#1C1C1C', textAlign: 'right' }}>PKR {Number(order.delivery_charge).toLocaleString()}</td>
              </tr>
              <tr style={{ borderTop: '2px solid #E8DDD4' }}>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 'bold', color: '#1C1C1C' }}>Total</td>
                <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 'bold', color: '#A68B6E', textAlign: 'right' }}>PKR {Number(order.total).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment info */}
        <div style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8DDD4', borderRadius: 6, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 'bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Payment Details</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Method: <strong style={{ color: '#1C1C1C', textTransform: 'capitalize' }}>{order.payment_method}</strong></p>
            <p style={{ margin: 0, fontSize: 13, color: '#6B7280' }}>Status: <strong style={{ color: '#15803D' }}>PAID</strong></p>
            {order.safepay_transaction_id && (
              <p style={{ margin: 0, fontSize: 12, color: '#6B7280', gridColumn: '1 / -1' }}>
                Transaction ID: {order.safepay_transaction_id}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E8DDD4', paddingTop: 16, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>Thank you for shopping with ZADIIS</p>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#D1D5DB' }}>This is a computer-generated invoice and does not require a physical signature.</p>
        </div>
      </div>
    </>
  )
}
