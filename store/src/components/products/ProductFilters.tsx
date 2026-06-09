'use client'
import { useRouter, useSearchParams } from 'next/navigation'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const PRICE_RANGES = [
  { label: 'Under PKR 2,000', min: '0', max: '2000' },
  { label: 'PKR 2,000 – 5,000', min: '2000', max: '5000' },
  { label: 'PKR 5,000 – 10,000', min: '5000', max: '10000' },
  { label: 'Over PKR 10,000', min: '10000', max: '999999' },
]

export default function ProductFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const updateParam = (key: string, value: string) => {
    const p = new URLSearchParams(params.toString())
    if (p.get(key) === value) {
      p.delete(key)
    } else {
      p.set(key, value)
    }
    router.push(`/shop?${p.toString()}`)
  }

  const setPrice = (min: string, max: string) => {
    const p = new URLSearchParams(params.toString())
    if (p.get('min') === min && p.get('max') === max) {
      p.delete('min')
      p.delete('max')
    } else {
      p.set('min', min)
      p.set('max', max)
    }
    router.push(`/shop?${p.toString()}`)
  }

  const clearAll = () => router.push('/shop')

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-sm uppercase tracking-wider">Filters</h3>
        <button onClick={clearAll} className="text-xs text-gray-400 hover:text-gray-700">Clear all</button>
      </div>
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(size => (
            <button
              key={size}
              onClick={() => updateParam('size', size)}
              className={`px-3 py-1 text-sm border rounded transition-colors ${params.get('size') === size ? 'text-white' : 'border-gray-300 hover:border-gray-500'}`}
              style={params.get('size') === size ? { backgroundColor: '#1C1C1C', borderColor: '#1C1C1C', color: 'white' } : undefined}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-sm uppercase tracking-wider mb-3">Price</h3>
        <div className="space-y-2">
          {PRICE_RANGES.map(range => (
            <button
              key={range.label}
              onClick={() => setPrice(range.min, range.max)}
              className="block text-sm text-left hover:opacity-70 transition-opacity"
              style={{ color: params.get('min') === range.min ? '#A68B6E' : undefined }}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
