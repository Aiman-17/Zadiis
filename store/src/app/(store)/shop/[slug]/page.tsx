import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import AddToCartButton from '@/components/products/AddToCartButton'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product
  try {
    product = await getProductBySlug(slug)
  } catch {
    notFound()
  }
  if (!product) notFound()

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-[3/4] relative rounded-lg overflow-hidden bg-white">
            {product.images[0] ? (
              <Image src={product.images[0]} alt={product.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <span className="text-gray-400">No image</span>
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1).map((img, i) => (
                <div key={i} className="aspect-square relative rounded overflow-hidden bg-white">
                  <Image src={img} alt={`${product.name} ${i + 2}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{product.name}</h1>
            <p className="text-2xl font-semibold mt-2" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString()}</p>
          </div>
          {product.description && (
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          )}
          <AddToCartButton product={product} />
          <p className="text-xs text-gray-400">Free delivery on orders over PKR 2,000</p>
        </div>
      </div>
    </div>
  )
}
