import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

const BADGE_BG: Record<string, string> = {
  'CUSTOMER FAVORITE': '#A68B6E',
  'BESTSELLER':        '#A68B6E',
  'LIMITED STOCK':     '#C62828',
  'FAST SELLING':      '#C62828',
  'JUST DROPPED':      '#1C1C1C',
  'NEW THIS WEEK':     '#1C1C1C',
  'TRENDING':          '#1C1C1C',
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

  return (
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="overflow-hidden rounded-lg bg-white aspect-[3/4] relative mb-3">
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

        {/* Discount badge — top left */}
        {discountPct > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#C62828', color: 'white' }}>
              {discountPct}% OFF
            </span>
          </div>
        )}

        {/* Secondary badge — top right */}
        {badge && BADGE_BG[badge] && (
          <div className="absolute top-2 right-2 z-10">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: BADGE_BG[badge], color: 'white', letterSpacing: '0.03em' }}>
              {badge}
            </span>
          </div>
        )}

        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Sold Out</span>
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm truncate">{product.name}</h3>
      <div className="flex items-baseline gap-2 mt-1">
        {salePrice ? (
          <>
            <span className="font-semibold text-sm" style={{ color: '#C62828' }}>PKR {salePrice.toLocaleString('en-US')}</span>
            <span className="text-xs line-through" style={{ color: '#9CA3AF' }}>PKR {product.price.toLocaleString('en-US')}</span>
          </>
        ) : (
          <span className="font-semibold text-sm" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString('en-US')}</span>
        )}
      </div>
    </Link>
  )
}
