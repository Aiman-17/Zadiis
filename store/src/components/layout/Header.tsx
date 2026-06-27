'use client'
import Link from 'next/link'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { getCartCount } from '@/lib/cart-store'
import { Button } from '@/components/ui/button'

export default function Header({ hasSale = false }: { hasSale?: boolean }) {
  const [cartCount, setCartCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setCartCount(getCartCount())
    const handler = () => setCartCount(getCartCount())
    window.addEventListener('cart-updated', handler)
    return () => window.removeEventListener('cart-updated', handler)
  }, [])

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b" style={{ backgroundColor: 'rgba(250,248,245,0.95)', borderColor: '#E8DDD4' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold tracking-widest uppercase" style={{ fontFamily: 'Playfair Display, serif' }}>
          ZADII'S
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex gap-8 text-sm font-medium">
          <Link href="/shop" className="hover:opacity-70 transition-opacity">Shop</Link>
          <Link href="/new-arrivals" className="hover:opacity-70 transition-opacity">New Arrivals</Link>
          {hasSale && <Link href="/sale" className="hover:opacity-70 transition-opacity font-semibold" style={{ color: '#C62828' }}>Sale</Link>}
          <Link href="/about" className="hover:opacity-70 transition-opacity">About</Link>
          <Link href="/contact" className="hover:opacity-70 transition-opacity">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/cart" className="relative p-2">
            <ShoppingBag size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#A68B6E', fontSize: '10px' }}>
                {cartCount}
              </span>
            )}
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden border-t px-4 py-4 flex flex-col gap-4 text-sm font-medium" style={{ borderColor: '#E8DDD4', backgroundColor: '#FAF8F5' }}>
          <Link href="/shop" onClick={() => setMenuOpen(false)}>Shop</Link>
          <Link href="/new-arrivals" onClick={() => setMenuOpen(false)}>New Arrivals</Link>
          {hasSale && <Link href="/sale" onClick={() => setMenuOpen(false)} className="font-semibold" style={{ color: '#C62828' }}>Sale</Link>}
          <Link href="/about" onClick={() => setMenuOpen(false)}>About</Link>
          <Link href="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
        </div>
      )}
    </header>
  )
}
