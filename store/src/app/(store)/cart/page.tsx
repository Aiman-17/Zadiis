'use client'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCart, removeFromCart, saveCart, type CartItem } from '@/lib/cart-store'

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setItems(getCart())
    setMounted(true)
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

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="h-32 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

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
              {(item.size || item.color) && (
                <p className="text-sm text-gray-500">{[item.size, item.color].filter(Boolean).join(' · ')}</p>
              )}
              {item.originalPrice && item.originalPrice > item.price ? (
                <div className="mt-1 space-y-0.5">
                  <p className="font-semibold" style={{ color: '#DC2626' }}>PKR {item.price.toLocaleString('en-US')}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs line-through" style={{ color: '#9CA3AF' }}>PKR {item.originalPrice.toLocaleString('en-US')}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                      Save PKR {(item.originalPrice - item.price).toLocaleString('en-US')}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="font-semibold mt-1" style={{ color: '#A68B6E' }}>PKR {item.price.toLocaleString('en-US')}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity - 1)}
                  className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100 text-sm"
                  style={{ borderColor: '#E8DDD4' }}
                >−</button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button
                  onClick={() => updateQty(item.id, item.size, item.color, item.quantity + 1)}
                  className="w-7 h-7 border rounded flex items-center justify-center hover:bg-gray-100 text-sm"
                  style={{ borderColor: '#E8DDD4' }}
                >+</button>
              </div>
            </div>
            <button onClick={() => remove(item.id, item.size, item.color)} className="text-gray-400 hover:text-red-500 shrink-0 transition-colors">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
        <div className="flex justify-between text-sm mb-2">
          <span>Subtotal</span>
          <span>PKR {subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm pb-4 mb-4 border-b" style={{ borderColor: '#E8DDD4' }}>
          <span>Shipping</span>
          <span className="text-gray-500">Calculated at checkout</span>
        </div>
        <Link href="/shop" className="text-sm hover:underline block mb-4" style={{ color: '#A68B6E' }}>
          ← Continue Shopping
        </Link>
        <Button asChild className="w-full text-white rounded-none uppercase tracking-widest py-6" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/checkout">Proceed to Checkout</Link>
        </Button>
      </div>
    </div>
  )
}
