import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  'JUST DROPPED':      { bg: '#1C1C1C', color: 'white' },
  'NEW THIS WEEK':     { bg: '#1C1C1C', color: 'white' },
  'NEW ARRIVAL':       { bg: '#A68B6E', color: 'white' },
  'TRENDING':          { bg: '#1C1C1C', color: 'white' },
  'BESTSELLER':        { bg: '#A68B6E', color: 'white' },
  'CUSTOMER FAVORITE': { bg: '#A68B6E', color: 'white' },
  'LAST CHANCE':       { bg: '#C62828', color: 'white' },
  'LIMITED STOCK':     { bg: '#C62828', color: 'white' },
  'FAST SELLING':      { bg: '#C62828', color: 'white' },
}

// Badges that render even when a sale discount is already shown
const ALWAYS_SHOW = new Set(['LAST CHANCE', 'JUST DROPPED'])

function getEffectiveStock(product: Product): number {
  const vs = product.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
    )
  }
  return product.stock_quantity
}

// Priority: LAST CHANCE > caller badge (TRENDING / BESTSELLER) > age badge
function getEffectiveBadge(product: Product, callerBadge?: string): string | undefined {
  const stock = getEffectiveStock(product)
  if (stock > 0 && stock <= 3) return 'LAST CHANCE'
  if (callerBadge) return callerBadge
  const ageDays = (Date.now() - new Date(product.created_at).getTime()) / 86_400_000
  if (ageDays <= 7) return 'JUST DROPPED'
  if (ageDays <= 30) return 'NEW ARRIVAL'
  return undefined
}

interface ProductCardProps {
  product: Product
  salePrice?: number
  badge?: string
}

export default function ProductCard({ product, salePrice, badge }: ProductCardProps) {
  const image = product.images[0] || ''
  const discountPct = salePrice && product.price > 0
    ? Math.round((1 - salePrice / product.price) * 100)
    : 0

  const effectiveBadge = getEffectiveBadge(product, badge)
  const badgeStyle = effectiveBadge ? BADGE_STYLE[effectiveBadge] : null
  const showBadge = effectiveBadge && badgeStyle && (!discountPct || ALWAYS_SHOW.has(effectiveBadge))

  const isSoldOut = getEffectiveStock(product) === 0

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
            <span className="text-gray-400 text-sm">No image</span>
          </div>
        )}

        {/* Sale discount badge — bottom-left */}
        {discountPct > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span
              className="text-sm font-bold px-2 py-0.5 rounded-sm"
              style={{ backgroundColor: '#C62828', color: 'white' }}
            >
              -{discountPct}%
            </span>
          </div>
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium tracking-wide">Sold Out</span>
          </div>
        )}
      </div>

      <h3 className="font-medium text-sm truncate leading-snug">{product.name}</h3>

      {showBadge && (
        <span
          className="inline-block text-xs font-semibold px-2 py-0.5 rounded-sm mt-1 tracking-wide"
          style={{ backgroundColor: badgeStyle!.bg, color: badgeStyle!.color }}
        >
          {effectiveBadge}
        </span>
      )}

      <div className="flex items-baseline gap-2 mt-1">
        {salePrice ? (
          <>
            <span className="font-semibold text-sm" style={{ color: '#A68B6E' }}>
              PKR {salePrice.toLocaleString('en-US')}
            </span>
            <span className="text-xs line-through" style={{ color: '#9CA3AF' }}>
              PKR {product.price.toLocaleString('en-US')}
            </span>
          </>
        ) : (
          <span className="font-semibold text-sm" style={{ color: '#A68B6E' }}>
            PKR {product.price.toLocaleString('en-US')}
          </span>
        )}
      </div>
    </Link>
  )
}
