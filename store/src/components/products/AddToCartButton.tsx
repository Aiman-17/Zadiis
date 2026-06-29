'use client'
import { useState, useMemo, useEffect } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/lib/cart-store'
import type { Product } from '@/types'

const STITCHED_SIZES = [
  { size: 'XS',  bust: '32–33', waist: '24–25', hips: '34–35', length: '52' },
  { size: 'S',   bust: '34–35', waist: '26–27', hips: '36–37', length: '53' },
  { size: 'M',   bust: '36–37', waist: '28–29', hips: '38–39', length: '53' },
  { size: 'L',   bust: '38–39', waist: '30–32', hips: '40–41', length: '54' },
  { size: 'XL',  bust: '40–42', waist: '33–35', hips: '42–44', length: '54' },
  { size: 'XXL', bust: '43–45', waist: '36–38', hips: '45–47', length: '55' },
]

function SizeGuideModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-xl overflow-y-auto"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Size Guide</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* How to measure */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#A68B6E' }}>How to Measure</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Bust', tip: 'Measure around the fullest part of your chest, keeping the tape parallel to the floor.' },
                { label: 'Waist', tip: 'Measure around the narrowest part of your waist, usually above the navel.' },
                { label: 'Hips', tip: 'Measure around the fullest part of your hips, about 8 inches below your waist.' },
                { label: 'Length', tip: 'Measure from shoulder to hem for the garment length.' },
              ].map(({ label, tip }) => (
                <div key={label} className="rounded-lg p-3" style={{ backgroundColor: '#FAF8F5', border: '1px solid #E8DDD4' }}>
                  <p className="text-xs font-bold mb-1" style={{ color: '#1C1C1C' }}>{label}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>{tip}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Stitched size chart */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: '#A68B6E' }}>Stitched Sizes (inches)</h3>
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E8DDD4' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
                    {['Size', 'Bust', 'Waist', 'Hips', 'Length'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-center text-xs font-semibold tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {STITCHED_SIZES.map((row, i) => (
                    <tr key={row.size} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#FAF8F5' }}>
                      <td className="px-3 py-2.5 text-center font-semibold" style={{ color: '#A68B6E' }}>{row.size}</td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#374151' }}>{row.bust}</td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#374151' }}>{row.waist}</td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#374151' }}>{row.hips}</td>
                      <td className="px-3 py-2.5 text-center text-xs" style={{ color: '#374151' }}>{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>All measurements in inches. Size up if between sizes.</p>
          </div>

          {/* Unstitched note */}
          <div className="rounded-lg p-4" style={{ backgroundColor: '#FEF9EC', border: '1px solid #F5D87A' }}>
            <p className="text-xs font-bold mb-1" style={{ color: '#92640A' }}>Unstitched Fabric</p>
            <p className="text-xs leading-relaxed" style={{ color: '#92640A' }}>
              Unstitched suits come as raw fabric (typically 3–4 metres for a 3-piece set) and can be stitched to any custom measurement at your local tailor. No standard size applies.
            </p>
          </div>

          {/* Tips */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#A68B6E' }}>Fit Tips</h3>
            <ul className="space-y-1.5">
              {[
                'Use a flexible measuring tape for accurate results.',
                'Measure over light clothing or undergarments.',
                'If between sizes, size up for a more comfortable fit.',
                'Pakistani kurtas run true to size — fitted through bust and hips.',
              ].map(tip => (
                <li key={tip} className="flex gap-2 text-xs" style={{ color: '#6B7280' }}>
                  <span style={{ color: '#A68B6E', marginTop: 1 }}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-center pb-2" style={{ color: '#9CA3AF' }}>
            Still unsure? WhatsApp us for a personal sizing recommendation.
          </p>
        </div>
      </div>
    </div>
  )
}

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

export default function AddToCartButton({ product, salePrice }: { product: Product; salePrice?: number }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')
  const [showSizeGuide, setShowSizeGuide] = useState(false)

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
      price: salePrice ?? product.price,
      originalPrice: salePrice ? product.price : undefined,
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
    <>
      {showSizeGuide && <SizeGuideModal onClose={() => setShowSizeGuide(false)} />}
    <div className="space-y-4">
      {hasSizes && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Size</p>
            <button
              type="button"
              onClick={() => setShowSizeGuide(true)}
              className="text-xs underline hover:opacity-70 transition-opacity"
              style={{ color: '#A68B6E' }}
            >
              Size Guide
            </button>
          </div>
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
        <p className="text-sm font-semibold" style={{ color: '#C62828' }}>
          {(() => {
            const parts = [selectedColor, selectedSize].filter(Boolean)
            return hasTracking && parts.length
              ? `Only ${selectedVariantQty} left in ${parts.join(' / ')}`
              : `Only ${selectedVariantQty} left in stock`
          })()}
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
    </>
  )
}
