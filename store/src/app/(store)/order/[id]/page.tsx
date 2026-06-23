import { supabaseAdmin } from '@/lib/supabase/server'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import type { OrderItem } from '@/types'
import PaymentVerifier from './PaymentVerifier'

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
                  {(item.size || item.color) && (
                    <p className="text-xs text-gray-400">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
                  )}
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
        {order.payment_status === 'paid' ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-medium text-green-700">✓ Payment confirmed. Your order is being processed.</p>
          </div>
        ) : order.payment_method === 'cod' ? (
          <div className="border rounded-lg p-4" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
            <p className="text-sm font-medium mb-1" style={{ color: '#1C1C1C' }}>Cash on Delivery</p>
            <p className="text-sm text-gray-500">Please keep PKR {Number(order.total).toLocaleString()} ready at the time of delivery.</p>
          </div>
        ) : (
          <PaymentVerifier orderId={order.id} />
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
