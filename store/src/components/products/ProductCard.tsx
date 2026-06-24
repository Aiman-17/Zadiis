import Link from 'next/link'
import Image from 'next/image'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
  salePrice?: number
}

export default function ProductCard({ product, salePrice }: ProductCardProps) {
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
        {salePrice && product.price > 0 && (
          <div className="absolute top-2 left-2 z-10">
            <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: '#DC2626', color: 'white' }}>
              {Math.round((1 - salePrice / product.price) * 100)}% OFF
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
            <span className="font-semibold text-sm" style={{ color: '#DC2626' }}>PKR {salePrice.toLocaleString()}</span>
            <span className="text-xs line-through" style={{ color: '#9CA3AF' }}>PKR {product.price.toLocaleString()}</span>
          </>
        ) : (
          <span className="font-semibold text-sm" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString()}</span>
        )}
      </div>
    </Link>
  )
}
