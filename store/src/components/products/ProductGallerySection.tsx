'use client'
import { useState } from 'react'
import { Flame, Hourglass } from 'lucide-react'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductSaleUrgency from '@/components/products/ProductSaleUrgency'
import NotifyMeButton from '@/components/products/NotifyMeButton'
import { getEffectiveStock } from '@/lib/stock'
import type { Product } from '@/types'

// Holds selectedColor as the single source of truth shared between the
// gallery (jumps to the color-tagged image) and AddToCartButton (variant
// stock lookups) — they were previously unrelated siblings, each with their
// own state, per research.md Decision 2.
export default function ProductGallerySection({
  product,
  salePrice,
  saleEndsAt,
  isTrending,
  soldLast24h,
}: {
  product: Product
  salePrice: number | null
  saleEndsAt: string | null
  isTrending: boolean
  soldLast24h: number
}) {
  const [selectedColor, setSelectedColor] = useState('')

  const totalStock = getEffectiveStock(product)
  const isSoldOut = totalStock === 0
  const isLastChance = totalStock > 0 && totalStock <= 3
  const savings = salePrice ? product.price - salePrice : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
      <ProductImageGallery
        images={product.images}
        name={product.name}
        imageColors={product.image_colors}
        selectedColor={selectedColor}
      />
      <div className="space-y-5 md:space-y-6 pt-2 md:pt-0">
        <div>
          {/* Category identity strip — contextual to product flags */}
          {salePrice ? (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#C62828', color: 'white' }}>Sale</span>
              <span className="text-xs" style={{ color: '#C62828' }}>Limited time price — ends when timer hits zero</span>
            </div>
          ) : isLastChance ? (
            <div className="flex items-center gap-1.5 mb-2">
              <Hourglass size={13} color="#C62828" style={{ animation: 'hourglass-flip 3s ease-in-out infinite', transformOrigin: 'center' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C62828' }}>Almost Gone — Final Stock</span>
            </div>
          ) : isTrending ? (
            <div className="flex items-center gap-1.5 mb-2">
              <Flame size={13} color="#ea580c" style={{ animation: 'fire-flicker 0.65s ease-in-out infinite alternate', transformOrigin: 'bottom center' }} />
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#ea580c' }}>Trending Now — High Demand</span>
            </div>
          ) : product.is_new_arrival ? (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#059669' }}>✦ Fresh Drop — Just Launched</span>
            </div>
          ) : product.best_seller_score && product.best_seller_score >= 5 ? (
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C9961A' }}>★ Our Most Loved Piece</span>
            </div>
          ) : null}

          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{product.name}</h1>

          {/* Price section */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {salePrice ? (
              <>
                <p className="text-2xl font-bold" style={{ color: '#A68B6E' }}>
                  PKR {salePrice.toLocaleString('en-US')}
                </p>
                <p className="text-lg line-through" style={{ color: '#9CA3AF' }}>
                  PKR {product.price.toLocaleString('en-US')}
                </p>
                <span className="text-xs font-bold px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#C62828', color: 'white' }}>
                  -{Math.round((1 - salePrice / product.price) * 100)}%
                </span>
                <span className="text-xs" style={{ color: '#10B981' }}>
                  Save PKR {savings.toLocaleString('en-US')}
                </span>
              </>
            ) : (
              <p className="text-2xl font-semibold" style={{ color: '#A68B6E' }}>
                PKR {product.price.toLocaleString('en-US')}
              </p>
            )}
            {isSoldOut && (
              <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Out of Stock</span>
            )}
          </div>

          {/* Sale urgency banner */}
          {salePrice && (
            <div className="mt-3">
              <ProductSaleUrgency
                endsAt={saleEndsAt}
                stockQty={totalStock}
              />
            </div>
          )}
        </div>

        {product.description && <p className="text-gray-600 leading-relaxed">{product.description}</p>}

        {/* Social proof */}
        {soldLast24h >= 2 && (
          <p className="text-sm font-medium" style={{ color: '#10B981' }}>
            🔥 {soldLast24h} sold in the last 24 hours
          </p>
        )}

        {/* Stock urgency — only on non-sale products (sale products use ProductSaleUrgency) */}
        {!salePrice && totalStock > 0 && totalStock <= 10 && (
          <p className="text-sm font-semibold" style={{ color: totalStock <= 3 ? '#B91C1C' : '#B45309' }}>
            {totalStock <= 3
              ? `Hurry! Only ${totalStock} left in stock`
              : `Only ${totalStock} left in stock`}
          </p>
        )}

        <AddToCartButton
          product={product}
          salePrice={salePrice ?? undefined}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />

        {/* Waitlist — shown when product is completely sold out */}
        {isSoldOut && <NotifyMeButton productId={product.id} />}
      </div>
    </div>
  )
}
