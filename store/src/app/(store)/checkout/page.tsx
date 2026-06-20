'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCart, clearCart } from '@/lib/cart-store'
import type { CartItem } from '@/lib/cart-store'
import type { DeliveryZone } from '@/types'

const BASE_PAYMENT_METHODS = [
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'card', label: 'Credit / Debit Card' },
]

const COD_METHOD = { id: 'cod', label: 'Cash on Delivery' }

export default function CheckoutPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<CartItem[]>([])
  const [zones, setZones] = useState<DeliveryZone[]>([])
  const [codEnabled, setCodEnabled] = useState(false)
  const [deliveryCharge, setDeliveryCharge] = useState(0)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    payment: '',
  })

  useEffect(() => {
    const cart = getCart()
    if (cart.length === 0) { router.push('/cart'); return }
    setItems(cart)
    fetch('/api/delivery-zones')
      .then(r => r.json())
      .then(({ zones, cod_enabled }: { zones: DeliveryZone[]; cod_enabled: boolean }) => {
        setZones(zones)
        setCodEnabled(cod_enabled)
      })
  }, [router])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleCityChange = (city: string) => {
    set('city', city)
    const zone = zones.find(z => z.city === city)
    setDeliveryCharge(zone?.delivery_charge ?? 0)
  }

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const total = subtotal + deliveryCharge
  const paymentMethods = codEnabled ? [...BASE_PAYMENT_METHODS, COD_METHOD] : BASE_PAYMENT_METHODS

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.payment) { alert('Please select a payment method'); return }
    setLoading(true)
    setError(null)
    const orderItems = items.map(i => ({
      product_id: i.id,
      product_name: i.name,
      sku: i.sku,
      size: i.size,
      color: i.color,
      quantity: i.quantity,
      price: i.price,
    }))
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          customer_phone: form.phone,
          customer_email: form.email || null,
          address: form.address,
          city: form.city,
          items: orderItems,
          subtotal,
          delivery_charge: deliveryCharge,
          total,
          payment_method: form.payment,
        }),
      })
      const data = await res.json()
      if (data.orderId) {
        clearCart()
        window.dispatchEvent(new Event('cart-updated'))
        router.push(`/order/${data.orderId}`)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  if (items.length === 0) return null

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Checkout</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input id="name" required value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input id="phone" required type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" value={form.email} onChange={e => set('email', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="address">Delivery Address *</Label>
          <Input id="address" required value={form.address} onChange={e => set('address', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label htmlFor="city">City *</Label>
          <select
            id="city"
            required
            value={form.city}
            onChange={e => handleCityChange(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm mt-1 bg-white"
            style={{ borderColor: '#E2E8F0' }}
          >
            <option value="">Select city</option>
            {zones.map(z => <option key={z.id} value={z.city}>{z.city}</option>)}
          </select>
          {form.city && (
            <p className="text-sm mt-1" style={{ color: '#A68B6E' }}>
              Delivery charge: PKR {deliveryCharge.toLocaleString()}
            </p>
          )}
        </div>
        <div>
          <Label className="block mb-2">Payment Method *</Label>
          <div className="space-y-2">
            {paymentMethods.map(m => (
              <label
                key={m.id}
                className="flex items-center gap-3 border rounded p-3 cursor-pointer transition-colors"
                style={{ borderColor: form.payment === m.id ? '#1C1C1C' : '#E2E8F0', backgroundColor: form.payment === m.id ? '#F9FAFB' : 'white' }}
              >
                <input type="radio" name="payment" value={m.id} checked={form.payment === m.id} onChange={() => set('payment', m.id)} />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border" style={{ borderColor: '#E8DDD4' }}>
          <div className="space-y-1 mb-3">
            {items.map(item => (
              <div key={`${item.id}-${item.size}-${item.color}`} className="flex justify-between text-sm text-gray-600">
                <span>{item.name} × {item.quantity}</span>
                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 space-y-1" style={{ borderColor: '#E8DDD4' }}>
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>PKR {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery</span>
              <span>{form.city ? `PKR ${deliveryCharge.toLocaleString()}` : '—'}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t" style={{ borderColor: '#E8DDD4' }}>
              <span>Total</span>
              <span>PKR {total.toLocaleString()}</span>
            </div>
          </div>
        </div>
        {error && (
          <div className="rounded border px-4 py-3 text-sm" style={{ borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', color: '#991B1B' }}>
            {error}
          </div>
        )}
        <Button type="submit" disabled={loading} className="w-full text-white rounded-none uppercase tracking-widest py-6" style={{ backgroundColor: '#1C1C1C' }}>
          {loading ? 'Placing Order...' : 'Place Order'}
        </Button>
      </form>
    </div>
  )
}
