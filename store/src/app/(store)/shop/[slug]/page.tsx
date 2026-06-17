import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductImageGallery from '@/components/products/ProductImageGallery'

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
      <Link
        href="/shop"
        className="text-sm inline-block mb-6 hover:underline"
        style={{ color: '#A68B6E' }}
      >
        ← Back to Shop
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductImageGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-2xl font-semibold" style={{ color: '#A68B6E' }}>
                PKR {product.price.toLocaleString()}
              </p>
              {product.stock_quantity === 0 && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Out of Stock</span>
              )}
            </div>
          </div>
          {product.description && (
            <p className="text-gray-600 leading-relaxed">{product.description}</p>
          )}
          <AddToCartButton product={product} />
          <p className="text-xs text-gray-400">Free delivery on orders over PKR 10,000</p>
        </div>
      </div>
    </div>
  )
}
