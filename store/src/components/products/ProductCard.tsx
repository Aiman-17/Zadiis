import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  'JUST DROPPED': { bg: '#1C1C1C', color: 'white' },
  'NEW ARRIVAL':  { bg: '#059669', color: 'white' },
  'TRENDING':     { bg: '#1C1C1C', color: 'white' },
  'BESTSELLER':   { bg: '#A68B6E', color: 'white' },
  'LAST CHANCE':  { bg: '#C62828', color: 'white' },
}

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

function getEffectiveBadge(product: Product, callerBadge?: string): string | undefined {
  const stock = getEffectiveStock(product)
  if (stock > 0 && stock <= 3) return 'LAST CHANCE'
  if (product.is_new_arrival) return 'NEW ARRIVAL'
  if (callerBadge) return callerBadge
  const ageDays = (Date.now() - new Date(product.created_at).getTime()) / 86_400_000
  if (ageDays <= 3) return 'JUST DROPPED'
  return undefined
}

// Small icon shown top-right on the image card
function getImageIcon(product: Product, callerBadge?: string): string | undefined {
  if (product.is_trending || callerBadge === 'TRENDING') return '🔥'
  if (
    product.is_bestseller ||
    (product.best_seller_score && product.best_seller_score > 0) ||
    callerBadge === 'BESTSELLER'
  ) return '⭐'
  if (product.is_new_arrival) return '✨'
  const ageDays = (Date.now() - new Date(product.created_at).getTime()) / 86_400_000
  if (ageDays <= 3) return '⚡'
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
  const imageIcon = getImageIcon(product, badge)
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

        {/* Sale discount — bottom-left */}
        {discountPct > 0 && (
          <div className="absolute bottom-2 left-2 z-10">
            <span
              className="text-xs font-bold px-1.5 py-0.5 rounded-sm"
              style={{ backgroundColor: '#C62828', color: 'white' }}
            >
              -{discountPct}%
            </span>
          </div>
        )}

        {/* On-image icon — top-right (🔥 ⭐ ✨ ⚡) */}
        {imageIcon && (
          <div className="absolute top-1.5 right-1.5 z-10 text-sm leading-none">
            {imageIcon}
          </div>
        )}

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-medium tracking-wide">Sold Out</span>
          </div>
        )}
      </div>

      <h3 className="font-medium text-sm truncate leading-snug">{product.name}</h3>

      {showBadge && (
        <span
          className="inline-block text-xs font-medium px-1.5 py-0.5 rounded-sm mt-0.5 tracking-wide"
          style={{ backgroundColor: badgeStyle!.bg, color: badgeStyle!.color }}
        >
          {effectiveBadge}
        </span>
      )}

      <div className="flex items-baseline gap-2 mt-0.5">
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
