'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCart, removeFromCart, saveCart, type CartItem } from '@/lib/cart-store'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])

  useEffect(() => {
    setItems(getCart())
  }, [])

  const remove = (id: string, size: string, color: string) => {
    removeFromCart(id, size, color)
    setItems(getCart())
    window.dispatchEvent(new Event('cart-updated'))
  }

  const updateQty = (id: string, size: string, color: string, qty: number) => {
    const cart = getCart()
      .map(i => i.id === id && i.size === size && i.color === color ? { ...i, quantity: qty } : i)
      .filter(i => i.quantity > 0)
    saveCart(cart)
    setItems(cart)
    window.dispatchEvent(new Event('cart-updated'))
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Your cart is empty</h1>
        <p className="text-gray-500 mb-8">Add some items to get started.</p>
        <Button asChild className="text-white rounded-none uppercase tracking-widest" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl mb-8" style={{ fontFamily: 'Playfair Display, serif' }}>Shopping Cart</h1>
      <div className="space-y-4 mb-8">
        {items.map(item => (
          <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4 bg-white p-4 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
            <div className="w-20 h-24 relative rounded overflow-hidden shrink-0 bg-gray-100">
              {item.image ? (
                <Image src={item.image} alt={item.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400 text-xs">No img</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.size} · {item.color}</p>
              <p className="font-semibold mt-1" style={{ color: '#A68B6E' }}>PKR {item.price.toLocaleString()}</p>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)}
                  className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100 text-sm"
                >−</button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)}
                  className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100 text-sm"
                >+</button>
              </div>
            </div>
            <button onClick={() => remove(item.id, item.size, item.color)} className="text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div className="flex justify-between font-semibold text-lg mb-4">
          <span>Total</span>
          <span>PKR {total.toLocaleString()}</span>
        </div>
        <Button asChild className="w-full text-white rounded-none uppercase tracking-widest py-6" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}
