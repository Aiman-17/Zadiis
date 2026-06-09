import { supabaseAdmin } from '@/lib/supabase/server'
import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <CheckCircle size={56} className="mx-auto mb-4" style={{ color: '#22C55E' }} />
      <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Order Placed!</h1>
      <p className="text-gray-500 mb-1">Thank you, {order.customer_name}</p>
      <p className="text-sm text-gray-400 mb-8">Order ID: #{order.id.slice(0, 8).toUpperCase()}</p>

      <div className="bg-white rounded-lg p-5 text-left mb-8 border" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="font-semibold mb-3">Order Summary</h2>
        {(order.items as OrderItem[]).map((item, i) => (
          <div key={i} className="flex justify-between text-sm py-2 border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
            <span className="text-gray-600">{item.product_name} × {item.quantity} ({item.size}, {item.color})</span>
            <span className="font-medium">PKR {(item.price * item.quantity).toLocaleString()}</span>
          </div>
        ))}
        <div className="flex justify-between font-semibold mt-3 pt-2 border-t" style={{ borderColor: '#E8DDD4' }}>
          <span>Total</span>
          <span>PKR {order.total.toLocaleString()}</span>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        We&apos;ll contact you on <strong>{order.customer_phone}</strong> to confirm delivery.
      </p>
      <Button asChild className="text-white rounded-none uppercase tracking-widest" style={{ backgroundColor: '#1C1C1C' }}>
        <Link href="/shop">Continue Shopping</Link>
      </Button>
    </div>
  )
}
