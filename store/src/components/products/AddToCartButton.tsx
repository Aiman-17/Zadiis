'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/lib/cart-store'
import type { Product } from '@/types'

const COLOR_MAP: Record<string, string> = {
  black: '#1a1a1a', white: '#FFFFFF', beige: '#F5F0E8',
  'navy blue': '#003087', navy: '#003087', blue: '#3B82F6',
  'royal blue': '#4169E1', red: '#DC2626', maroon: '#800000',
  pink: '#EC4899', 'dusty rose': '#D4A5A5', blush: '#FFB6C1',
  mint: '#98FFB7', sage: '#9DC183', olive: '#808000',
  brown: '#A0522D', camel: '#C19A6B', grey: '#9CA3AF',
  gray: '#9CA3AF', cream: '#FFFDD0', 'off white': '#F8F6F0',
  gold: '#FFD700', silver: '#C0C0C0', purple: '#7C3AED',
  lavender: '#E6E6FA', coral: '#FF6B6B', teal: '#0D9488', green: '#16A34A',
}

function getColorHex(name: string) {
  return COLOR_MAP[name.toLowerCase()] ?? '#D1D5DB'
}

export default function AddToCartButton({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const hasSizes = product.sizes.length > 0 && !(product.sizes.length === 1 && product.sizes[0] === 'Unstitched')
  const hasTracking = Object.keys(product.variant_stock ?? {}).length > 0

  // When a color is selected, determine which sizes are out of stock under that color
  const isSizeDisabled = (size: string): boolean => {
    if (!hasTracking) return false
    const c = selectedColor || '_'
    const qty = product.variant_stock?.[c]?.[size]
    return qty !== undefined && qty <= 0
  }

  // Determine which colors are completely out of stock (all sizes under that color are 0)
  const isColorDisabled = (color: string): boolean => {
    if (!hasTracking) return false
    const colorStock = product.variant_stock?.[color]
    if (!colorStock) return false
    return Object.values(colorStock).every(qty => qty <= 0)
  }

  // Compute available qty for currently selected variant
  const selectedVariantQty = useMemo(() => {
    if (!hasTracking) return product.stock_quantity
    const c = selectedColor || '_'
    const s = selectedSize || '_'
    const qty = product.variant_stock?.[c]?.[s]
    return qty !== undefined ? qty : product.stock_quantity
  }, [hasTracking, selectedColor, selectedSize, product])

  const handleAdd = () => {
    if (hasSizes && !selectedSize) { setError('Please select a size'); return }
    if (product.colors.length > 0 && !selectedColor) { setError('Please select a color'); return }
    if (hasTracking && selectedVariantQty <= 0) { setError('This combination is out of stock'); return }
    setError('')
    addToCart({
      id: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      image: product.images[0] || '',
      size: selectedSize,
      color: selectedColor,
      quantity: 1,
    })
    window.dispatchEvent(new Event('cart-updated'))
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const totalOutOfStock = product.stock_quantity === 0

  return (
    <div className="space-y-4">
      {hasSizes && (
        <div>
          <p className="text-sm font-medium mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => {
              const disabled = isSizeDisabled(size)
              return (
                <button
                  key={size}
                  onClick={() => { if (!disabled) { setSelectedSize(size); setError('') } }}
                  disabled={disabled}
                  className="px-4 py-2 text-sm border rounded transition-colors relative"
                  style={
                    disabled
                      ? { borderColor: '#E8DDD4', color: '#D1D5DB', cursor: 'not-allowed', textDecoration: 'line-through' }
                      : selectedSize === size
                        ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' }
                        : { borderColor: '#E8DDD4' }
                  }
                >
                  {size}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {product.colors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">
            Color
            {selectedColor && <span className="font-normal text-gray-500 ml-2">{selectedColor}</span>}
          </p>
          <div className="flex flex-wrap gap-3">
            {product.colors.map(color => {
              const disabled = isColorDisabled(color)
              return (
                <button
                  key={color}
                  onClick={() => { if (!disabled) { setSelectedColor(color); setSelectedSize(''); setError('') } }}
                  disabled={disabled}
                  title={disabled ? `${color} — sold out` : color}
                  className="w-8 h-8 rounded-full border-2 transition-all relative"
                  style={{
                    backgroundColor: getColorHex(color),
                    borderColor: selectedColor === color ? '#A68B6E' : '#E8DDD4',
                    boxShadow: selectedColor === color ? '0 0 0 2px #FAF8F5, 0 0 0 4px #A68B6E' : 'none',
                    opacity: disabled ? 0.35 : 1,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {disabled && (
                    <span
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ fontSize: 16, color: '#999', lineHeight: 1 }}
                    >
                      ╲
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {!totalOutOfStock && selectedVariantQty > 0 && selectedVariantQty <= 5 && (
        <p className="text-sm" style={{ color: '#B45309' }}>
          Only {selectedVariantQty} left in stock
        </p>
      )}

      {error && <p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p>}

      <Button
        onClick={handleAdd}
        disabled={totalOutOfStock || (hasTracking && selectedSize !== '' && selectedVariantQty <= 0)}
        className="w-full text-white rounded-none uppercase tracking-widest py-6 transition-colors"
        style={{ backgroundColor: added ? '#A68B6E' : '#1C1C1C' }}
      >
        {totalOutOfStock ? 'Sold Out' : added ? 'Added to Cart!' : 'Add to Cart'}
      </Button>
    </div>
  )
}
