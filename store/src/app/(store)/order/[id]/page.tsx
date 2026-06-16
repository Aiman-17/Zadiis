import { supabaseAdmin } from '@/lib/supabase/server'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { OrderItem } from '@/types'

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Order not found.</p>
        <Link href="/" className="text-sm underline mt-4 block">Back to home</Link>
      </div>
    )
  }

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
  const whatsappMessage = encodeURIComponent(`Hi! I just placed order ${order.order_number} on ZADIIS`)
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
  const isPaid = order.payment_status === 'paid'

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      {/* Header */}
      <div className="text-center mb-8">
        <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#22C55E' }} />
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Order Placed!</h1>
        <p className="text-gray-500 mt-1">Thank you, {order.customer_name}</p>
      </div>

      {/* Order Card — designed to be screenshottable */}
      <div className="bg-white rounded-lg border overflow-hidden mb-6" style={{ borderColor: '#E8DDD4' }}>
        {/* Card header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS</p>
              <p className="text-xs text-gray-500 mt-0.5">{new Date(order.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Order</p>
              <p className="font-bold text-lg" style={{ color: '#A68B6E' }}>{order.order_number}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-5 py-4 border-b" style={{ borderColor: '#E8DDD4' }}>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Items</p>
          <div className="space-y-2">
            {(order.items as OrderItem[]).map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  <span>{item.product_name}</span>
                  {item.sku && <span className="text-gray-400 ml-1">({item.sku})</span>}
                  <span className="text-gray-500"> × {item.quantity}</span>
                  <p className="text-xs text-gray-400">{item.size} · {item.color}</p>
                </div>
                <span className="font-medium shrink-0 ml-4">PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="px-5 py-4 border-b space-y-1" style={{ borderColor: '#E8DDD4' }}>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span>PKR {Number(order.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Delivery</span>
            <span>PKR {Number(order.delivery_charge).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold pt-1">
            <span>Total</span>
            <span>PKR {Number(order.total).toLocaleString()}</span>
          </div>
        </div>

        {/* Delivery + payment info */}
        <div className="px-5 py-4 text-sm text-gray-500 space-y-1">
          <p><span className="font-medium text-gray-700">Payment:</span> {order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1)}</p>
          <p><span className="font-medium text-gray-700">Deliver to:</span> {order.address}, {order.city}</p>
          <p><span className="font-medium text-gray-700">Phone:</span> {order.customer_phone}</p>
        </div>
      </div>

      {/* Payment status message */}
      <div className="text-center mb-6">
        {isPaid ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-700">✓ Payment confirmed. Your order is being processed.</p>
          </div>
        ) : (
          <div className="border rounded-lg p-4" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
            <p className="text-sm text-gray-600 mb-3">
              Screenshot this page and send it to our WhatsApp along with any questions about your order.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-white text-sm font-medium"
              style={{ backgroundColor: '#25D366' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.139.564 4.145 1.546 5.879L0 24l6.335-1.524A11.953 11.953 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.032-1.386l-.361-.214-3.741.9.944-3.653-.235-.374A9.818 9.818 0 112 12c0-5.414 4.404-9.818 9.818-9.818 2.695 0 5.232 1.05 7.136 2.954A10.023 10.023 0 0121.818 12c0 5.414-4.404 9.818-9.818 9.818z"/>
              </svg>
              Contact on WhatsApp
            </a>
          </div>
        )}
      </div>

      <div className="text-center">
        <Link href="/shop" className="text-sm hover:underline" style={{ color: '#A68B6E' }}>
          ← Continue Shopping
        </Link>
      </div>
    </div>
  )
}
