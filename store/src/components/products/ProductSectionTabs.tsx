'use client'
import { useState } from 'react'
import Link from 'next/link'
import ProductCard from './ProductCard'
import type { Product } from '@/types'

const SECTIONS = [
  { key: 'trending',     label: 'Trending',      badge: 'TRENDING'   as const, accent: '#C62828', sub: 'Hot This Week',  viewAll: '/shop',         viewAllLabel: 'View All' },
  { key: 'newArrivals',  label: 'New Arrivals',   badge: undefined,              accent: '#059669', sub: 'Just Launched',  viewAll: '/new-arrivals', viewAllLabel: 'View All New Arrivals' },
  { key: 'justDropped',  label: 'Just Dropped',   badge: undefined,              accent: '#1C1C1C', sub: 'New In',         viewAll: '/shop',         viewAllLabel: 'Browse Shop' },
  { key: 'bestSellers',  label: 'Best Sellers',   badge: 'BESTSELLER' as const, accent: '#A68B6E', sub: undefined,        viewAll: '/shop',         viewAllLabel: 'View All' },
  { key: 'lastChance',   label: 'Last Chance',    badge: undefined,              accent: '#C62828', sub: 'Almost Gone',   viewAll: '/shop',         viewAllLabel: 'Browse Shop' },
] as const

type SectionKey = typeof SECTIONS[number]['key']

interface Props {
  trending: Product[]
  newArrivals: Product[]
  justDropped: Product[]
  bestSellers: Product[]
  lastChance: Product[]
  salePriceMap: Record<string, number>
}

export default function ProductSectionTabs({ trending, newArrivals, justDropped, bestSellers, lastChance, salePriceMap }: Props) {
  const allData: Record<SectionKey, Product[]> = { trending, newArrivals, justDropped, bestSellers, lastChance }
  const available = SECTIONS.filter(s => allData[s.key].length > 0)

  const [active, setActive] = useState<SectionKey>(() => available[0]?.key ?? 'trending')

  if (available.length === 0) return null

  const section = SECTIONS.find(s => s.key === active)!
  const products = allData[active].slice(0, 4)

  return (
    <section className="max-w-6xl mx-auto px-4 py-6 border-t" style={{ borderColor: '#E8DDD4' }}>
      {/* Tab strip */}
      <div className="relative mb-6">
        <div className="flex gap-0 border-b overflow-x-auto scrollbar-none" style={{ borderColor: '#E8DDD4' }}>
          {available.map(s => {
            const isActive = s.key === active
            return (
              <button
                key={s.key}
                onClick={() => setActive(s.key)}
                className="shrink-0 px-3 md:px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap"
                style={isActive
                  ? { color: s.accent, borderBottom: `2px solid ${s.accent}`, marginBottom: '-1px' }
                  : { color: '#9CA3AF', borderBottom: '2px solid transparent', marginBottom: '-1px' }}
              >
                {s.label}
                {s.sub && isActive && (
                  <span
                    className="ml-1.5 text-[9px] font-bold uppercase tracking-widest hidden sm:inline"
                    style={{ color: s.accent }}
                  >
                    {s.sub}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {/* Fade hint to signal horizontal scroll on mobile */}
        <div className="absolute right-0 top-0 bottom-[1px] w-8 pointer-events-none md:hidden"
          style={{ background: 'linear-gradient(to right, transparent, #FAF8F5)' }} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            badge={section.badge}
            salePrice={salePriceMap[product.id]}
          />
        ))}
      </div>

      {/* View All */}
      <div className="flex justify-end mt-4">
        <Link
          href={section.viewAll}
          className="text-xs font-semibold uppercase tracking-widest hover:opacity-70 transition-opacity"
          style={{ color: section.accent }}
        >
          {section.viewAllLabel} →
        </Link>
      </div>
    </section>
  )
}
