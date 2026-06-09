'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addToCart } from '@/lib/cart-store'
import type { Product } from '@/types'

export default function AddToCartButton({ product }: { product: Product }) {
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [added, setAdded] = useState(false)

  const handleAdd = () => {
    if (!selectedSize) { alert('Please select a size'); return }
    if (!selectedColor) { alert('Please select a color'); return }

    addToCart({
      id: product.id,
      name: product.name,
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

  return (
    <div className="space-y-4">
      {product.sizes.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Size</p>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className="px-4 py-2 text-sm border rounded transition-colors"
                style={selectedSize === size ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' } : { borderColor: '#D1D5DB' }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}
      {product.colors.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Color</p>
          <div className="flex flex-wrap gap-2">
            {product.colors.map(color => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className="px-4 py-2 text-sm border rounded transition-colors"
                style={selectedColor === color ? { backgroundColor: '#1C1C1C', color: 'white', borderColor: '#1C1C1C' } : { borderColor: '#D1D5DB' }}
              >
                {color}
              </button>
            ))}
          </div>
        </div>
      )}
      <Button
        onClick={handleAdd}
        disabled={product.stock_quantity === 0}
        className="w-full text-white rounded-none uppercase tracking-widest py-6 transition-colors"
        style={{ backgroundColor: added ? '#A68B6E' : '#1C1C1C' }}
      >
        {product.stock_quantity === 0 ? 'Sold Out' : added ? 'Added!' : 'Add to Cart'}
      </Button>
    </div>
  )
}
