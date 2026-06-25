import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import AddToCartButton from '@/components/products/AddToCartButton'
import ProductImageGallery from '@/components/products/ProductImageGallery'
import ReviewListWrapper from '@/components/products/ReviewListWrapper'
import ProductCard from '@/components/products/ProductCard'
import ProductSaleUrgency from '@/components/products/ProductSaleUrgency'
import NotifyMeButton from '@/components/products/NotifyMeButton'
import type { Review, Product } from '@/types'
import type { Metadata } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://zadiis.com'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('name, description, images, price, slug')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (!product) return { title: 'Product Not Found' }

  return {
    title: product.name,
    description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADIIS`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADIIS`,
      images: product.images?.[0] ? [{ url: product.images[0] }] : [],
      type: 'website',
      url: `${BASE_URL}/shop/${product.slug}`,
    },
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  let product: Product
  try {
    product = await getProductBySlug(slug)
  } catch {
    notFound()
  }
  if (!product!) notFound()

  let reviews: Review[] = []
  let salePrice: number | null = null
  let saleEndsAt: string | null = null
  let isSaleActive = false
  let relatedProducts: Product[] = []
  let soldLast24h = 0

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const [reviewsRes, saleRes, relatedRes, recentOrderIdsRes] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('product_id', product!.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('sales')
        .select('id, ends_at')
        .eq('is_active', true)
        .maybeSingle(),
      supabaseAdmin
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', product!.category_id)
        .neq('id', product!.id)
        .limit(4),
      // Fetch qualifying order IDs from last 24h — join happens at DB level
      supabaseAdmin
        .from('orders')
        .select('id')
        .in('order_status', ['processing', 'shipped', 'delivered'])
        .gte('created_at', oneDayAgo),
    ])

    reviews = (reviewsRes.data || []) as Review[]
    relatedProducts = (relatedRes.data || []) as Product[]

    const recentOrderIds = (recentOrderIdsRes.data || []).map((o: { id: string }) => o.id)
    if (recentOrderIds.length > 0) {
      const { data: soldItems } = await supabaseAdmin
        .from('order_items')
        .select('quantity')
        .eq('product_id', product!.id)
        .in('order_id', recentOrderIds)
      soldLast24h = (soldItems || []).reduce((s: number, i: { quantity: number }) => s + i.quantity, 0)
    }

    if (saleRes.data) {
      isSaleActive = true
      saleEndsAt = saleRes.data.ends_at
      const { data: sp } = await supabaseAdmin
        .from('sale_products')
        .select('sale_price')
        .eq('sale_id', saleRes.data.id)
        .eq('product_id', product!.id)
        .maybeSingle()
      if (sp) salePrice = sp.sale_price
    }
  } catch {
    // fail gracefully
  }

  const isSoldOut = (() => {
    const vs = product!.variant_stock
    if (vs && Object.keys(vs).length > 0) {
      return Object.values(vs).reduce(
        (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
      ) === 0
    }
    return product!.stock_quantity === 0
  })()

  const displayPrice = salePrice ?? product!.price
  const savings = salePrice ? product!.price - salePrice : 0

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product!.name,
    description: product!.description,
    image: product!.images,
    sku: product!.sku,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: displayPrice,
      availability: product!.stock_quantity > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${BASE_URL}/shop/${product!.slug}`,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <Link href="/shop" className="text-sm inline-block mb-6 hover:underline" style={{ color: '#A68B6E' }}>
          ← Back to Shop
        </Link>
        {/* Ambient sale banner — shown on non-sale products when a sale is running */}
        {isSaleActive && !salePrice && (
          <a href="/sale" className="flex items-center gap-2 mb-6 px-4 py-2.5 rounded-lg text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: '#FFF8F2', border: '1px solid #F0E4D4' }}>
            <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: '#C62828' }} />
            <span style={{ color: '#1C1C1C' }}>Sale On Now — Browse discounted styles</span>
            <span className="ml-auto text-xs font-semibold" style={{ color: '#C62828' }}>View Sale →</span>
          </a>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <ProductImageGallery images={product!.images} name={product!.name} />
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>{product!.name}</h1>

              {/* Price section */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {salePrice ? (
                  <>
                    <p className="text-2xl font-bold" style={{ color: '#A68B6E' }}>
                      PKR {salePrice.toLocaleString('en-US')}
                    </p>
                    <p className="text-lg line-through" style={{ color: '#9CA3AF' }}>
                      PKR {product!.price.toLocaleString('en-US')}
                    </p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-sm" style={{ backgroundColor: '#C62828', color: 'white' }}>
                      -{Math.round((1 - salePrice / product!.price) * 100)}%
                    </span>
                    <span className="text-xs" style={{ color: '#10B981' }}>
                      Save PKR {savings.toLocaleString('en-US')}
                    </span>
                  </>
                ) : (
                  <p className="text-2xl font-semibold" style={{ color: '#A68B6E' }}>
                    PKR {product!.price.toLocaleString('en-US')}
                  </p>
                )}
                {product!.stock_quantity === 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-500">Out of Stock</span>
                )}
              </div>

              {/* Sale urgency banner */}
              {salePrice && (
                <div className="mt-3">
                  <ProductSaleUrgency
                    endsAt={saleEndsAt}
                    stockQty={product!.stock_quantity}
                  />
                </div>
              )}
            </div>

            {product!.description && <p className="text-gray-600 leading-relaxed">{product!.description}</p>}

            {/* Social proof — only show when meaningful (2+ sold) */}
            {soldLast24h >= 2 && (
              <p className="text-sm font-medium" style={{ color: '#10B981' }}>
                🔥 {soldLast24h} sold in the last 24 hours
              </p>
            )}

            {/* Stock urgency — only on non-sale products (sale products use ProductSaleUrgency) */}
            {!salePrice && product!.stock_quantity > 0 && product!.stock_quantity <= 10 && (
              <p className="text-sm font-semibold" style={{ color: product!.stock_quantity <= 3 ? '#B91C1C' : '#B45309' }}>
                {product!.stock_quantity <= 3
                  ? `Hurry! Only ${product!.stock_quantity} left in stock`
                  : `Only ${product!.stock_quantity} left in stock`}
              </p>
            )}

            <AddToCartButton product={product!} salePrice={salePrice ?? undefined} />

            {/* Waitlist — shown when product is completely sold out */}
            {isSoldOut && <NotifyMeButton productId={product!.id} />}
            <p className="text-xs text-gray-400">Free delivery on orders over PKR 10,000</p>
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-8 border-t pt-6" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="text-lg mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Customer Reviews</h2>
          <ReviewListWrapper productId={product!.id} initialReviews={reviews} />
        </div>

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 border-t pt-6" style={{ borderColor: '#E8DDD4' }}>
            <h2 className="text-lg mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedProducts.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
