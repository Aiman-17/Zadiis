'use client'
import { useRef, useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

export default function ProductSlider({ products }: { products: Product[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)

  const sync = () => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    sync()
    el.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      el.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [products])

  const scroll = (dir: 'left' | 'right') => {
    const el = ref.current
    if (!el) return
    // Scroll by roughly one card width
    const card = el.querySelector<HTMLElement>('[data-card]')
    const amount = card ? card.offsetWidth + 12 : 280
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' })
  }

  return (
    <div className="relative -mx-1">
      {/* Left arrow — desktop only */}
      <button
        onClick={() => scroll('left')}
        aria-label="Previous"
        className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-9 h-9 rounded-full bg-white border shadow-sm items-center justify-center transition-all"
        style={{
          borderColor: '#E8DDD4',
          opacity: canLeft ? 1 : 0,
          pointerEvents: canLeft ? 'auto' : 'none',
        }}
      >
        <ChevronLeft size={18} style={{ color: '#1C1C1C' }} />
      </button>

      {/* Scroll track */}
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto px-1 pb-2 [&::-webkit-scrollbar]:hidden"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {products.map(p => (
          <div
            key={p.id}
            data-card
            className="flex-shrink-0"
            style={{
              scrollSnapAlign: 'start',
              // 2 per row mobile, 3 on sm, 4 on md+
              width: 'clamp(160px, 46vw, 220px)',
            }}
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {/* Right arrow — desktop only */}
      <button
        onClick={() => scroll('right')}
        aria-label="Next"
        className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-9 h-9 rounded-full bg-white border shadow-sm items-center justify-center transition-all"
        style={{
          borderColor: '#E8DDD4',
          opacity: canRight ? 1 : 0,
          pointerEvents: canRight ? 'auto' : 'none',
        }}
      >
        <ChevronRight size={18} style={{ color: '#1C1C1C' }} />
      </button>
    </div>
  )
}
