import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ReviewListWrapper from '@/components/products/ReviewListWrapper'
import type { Review } from '@/types'

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product
  try {
    product = await getProductBySlug(slug)
  } catch {
    notFound()
  }
  if (!product) notFound()

  let reviews: Review[] = []
  try {
    const { data } = await supabaseAdmin
      .from('reviews')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
    reviews = (data || []) as Review[]
  } catch {
    // reviews unavailable — fail gracefully
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/shop" className="text-sm inline-block mb-6 hover:underline" style={{ color: '#A68B6E' }}>
        ← Back to Shop
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <ProductImageGallery images={product.images} name={product.name} />
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{product.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-2xl font-semibold" style={{ color: '#A68B6E' }}>PKR {product.price.toLocaleString()}</p>
              {product.stock_quantity === 0 && (
                <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Out of Stock</span>
              )}
            </div>
          </div>
          {product.description && <p className="text-gray-600 leading-relaxed">{product.description}</p>}
          <AddToCartButton product={product} />
          <p className="text-xs text-gray-400">Free delivery on orders over PKR 10,000</p>
        </div>
      </div>

      {/* Reviews section */}
      <div className="mt-16 border-t pt-10" style={{ borderColor: '#E8DDD4' }}>
        <h2 className="text-xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Customer Reviews</h2>
        <ReviewListWrapper productId={product.id} initialReviews={reviews} />
      </div>
    </div>
  )
}
