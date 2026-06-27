'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Flame, Hourglass } from 'lucide-react'
import type { Product } from '@/types'

function getEffectiveStock(product: Product): number {
  const vs = product.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
    )
  }
  return product.stock_quantity
}

interface ProductCardProps {
  product: Product
  salePrice?: number
  badge?: string
}

export default function ProductCard({ product, salePrice, badge }: ProductCardProps) {
  const image = product.images[0] || ''
  const stock = getEffectiveStock(product)
  const isSoldOut = stock === 0

  const discountPct = salePrice != null && product.price > 0
    ? Math.round((1 - salePrice / product.price) * 100)
    : 0

  // Independent signal checks — all can show simultaneously
  const showFire       = !!(product.is_trending || badge === 'TRENDING')
  const showHourglass  = stock > 0 && stock <= 3
  const showNewArrival = !!product.is_new_arrival
  const showBestseller = !!((product.best_seller_score && product.best_seller_score >= 5) || badge === 'BESTSELLER')
  const hasBadgeRow    = showFire || showHourglass || showBestseller

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-sm bg-white aspect-[3/4] relative mb-2">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100">
            <span className="text-gray-400 text-xs">No image</span>
          </div>
        )}

        {/* Top-right badges: discount + NEW stacked */}
        {(discountPct > 0 || showNewArrival) && (
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            {discountPct > 0 && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5"
                style={{ backgroundColor: '#C62828', color: 'white' }}
              >
                -{discountPct}%
              </span>
            )}
            {showNewArrival && (
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-widest"
                style={{ backgroundColor: '#A68B6E', color: 'white' }}
              >
                New
              </span>
            )}
          </div>
        )}

        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-[10px] font-medium tracking-wide">Sold Out</span>
          </div>
        )}
      </div>

      <h3 className="font-medium text-xs truncate leading-snug">{product.name}</h3>

      {/* Badge row — animated icons + bestseller badge */}
      {hasBadgeRow && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {showFire && (
            <span
              className="inline-flex items-center justify-center w-[18px] h-[18px]"
              style={{
                color: '#ea580c',
                animation: 'fire-flicker 0.65s ease-in-out infinite alternate',
                transformOrigin: 'bottom center',
              }}
            >
              <Flame size={14} strokeWidth={2.2} />
            </span>
          )}
          {showHourglass && (
            <span
              className="inline-flex items-center justify-center w-[18px] h-[18px]"
              style={{
                color: '#C62828',
                animation: 'hourglass-flip 3s ease-in-out infinite',
                transformOrigin: 'center center',
              }}
            >
              <Hourglass size={13} strokeWidth={2.2} />
            </span>
          )}
          {showBestseller && (
            <span
              className="text-[9px] font-semibold px-1.5 py-[1px] rounded-sm tracking-widest uppercase"
              style={{ backgroundColor: '#C9961A', color: 'white' }}
            >
              Bestseller
            </span>
          )}
        </div>
      )}

      <div className="flex items-baseline gap-1.5 mt-0.5">
        {salePrice != null ? (
          <>
            <span className="font-semibold text-xs" style={{ color: '#A68B6E' }}>
              PKR {salePrice.toLocaleString('en-US')}
            </span>
            <span className="text-[9px] line-through" style={{ color: '#9CA3AF' }}>
              PKR {product.price.toLocaleString('en-US')}
            </span>
          </>
        ) : (
          <span className="font-semibold text-xs" style={{ color: '#A68B6E' }}>
            PKR {product.price.toLocaleString('en-US')}
          </span>
        )}
      </div>
    </Link>
  )
}
