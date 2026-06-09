import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

export default function ProductCard({ product }: { product: Product }) {
  const image = product.images[0] || ''

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
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Sold Out</span>
          </div>
        )}
      </div>
      <h3 className="font-medium text-sm truncate">{product.name}</h3>
      <p className="font-semibold text-sm mt-1" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString()}</p>
    </Link>
  )
}
