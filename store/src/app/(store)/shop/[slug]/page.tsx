export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProductBySlug } from '@/lib/products'
import { getMerchandisingContext } from '@/lib/merchandising'
import { supabaseAdmin } from '@/lib/supabase/server'
import ProductGallerySection from '@/components/products/ProductGallerySection'
import PromoPopups from '@/components/store/PromoPopup'
import ReviewListWrapper from '@/components/products/ReviewListWrapper'
import ProductSlider from '@/components/products/ProductSlider'
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
    description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADII'S`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 155) || `Shop ${product.name} at ZADII'S`,
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
  let saleTitle: string | null = null
  let isSaleActive = false
  let relatedProducts: Product[] = []
  let relatedSalePrices: Record<string, number> = {}
  let soldLast24h = 0
  let isTrending = false
  let freeDeliveryEnabled = true

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  try {
    const [reviewsRes, saleRes, relatedRes, recentOrderIdsRes, merchContext, deliverySettingRes] = await Promise.all([
      supabaseAdmin
        .from('reviews')
        .select('*')
        .eq('product_id', product!.id)
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('sales')
        .select('id, title, ends_at')
        .eq('is_active', true)
        .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
        .maybeSingle(),
      supabaseAdmin
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('category_id', product!.category_id)
        .neq('id', product!.id)
        .limit(7),
      // Fetch qualifying order IDs from last 24h — join happens at DB level
      supabaseAdmin
        .from('orders')
        .select('id')
        .in('order_status', ['processing', 'shipped', 'delivered'])
        .gte('created_at', oneDayAgo),
      // Same qualifying set as every other page (specs/003-merchandising-badges-v2)
      getMerchandisingContext(),
      supabaseAdmin.from('store_settings').select('value').eq('key', 'free_delivery_enabled').maybeSingle(),
    ])
    freeDeliveryEnabled = deliverySettingRes.data?.value !== 'false'

    reviews = (reviewsRes.data || []) as Review[]
    relatedProducts = (relatedRes.data || []) as Product[]
    isTrending = merchContext.trendingIds.has(product!.id)

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
      saleTitle = saleRes.data.title
      const { data: sp } = await supabaseAdmin
        .from('sale_products')
        .select('sale_price')
        .eq('sale_id', saleRes.data.id)
        .eq('product_id', product!.id)
        .maybeSingle()
      if (sp) salePrice = sp.sale_price

      if (relatedProducts.length > 0) {
        const { data: relatedSp } = await supabaseAdmin
          .from('sale_products')
          .select('product_id, sale_price')
          .eq('sale_id', saleRes.data.id)
          .in('product_id', relatedProducts.map(p => p.id))
        relatedSalePrices = Object.fromEntries((relatedSp || []).map(sp => [sp.product_id, sp.sale_price]))
      }
    }
  } catch (e) {
    console.error('ProductPage sale/related data fetch failed:', e)
  }

  const displayPrice = salePrice ?? product!.price

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
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
        <PromoPopups saleActive={isSaleActive} saleTitle={saleTitle} freeDeliveryEnabled={freeDeliveryEnabled} />
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

        <ProductGallerySection
          product={product!}
          salePrice={salePrice}
          saleEndsAt={saleEndsAt}
          isTrending={isTrending}
          soldLast24h={soldLast24h}
        />

        {/* Reviews section */}
        <div className="mt-8 border-t pt-6" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="text-lg mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Customer Reviews</h2>
          <ReviewListWrapper productId={product!.id} initialReviews={reviews} />
        </div>

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <div className="mt-8 border-t pt-6" style={{ borderColor: '#E8DDD4' }}>
            <h2 className="text-lg mb-4 text-center" style={{ fontFamily: 'Playfair Display, serif' }}>This Is For You</h2>
            <ProductSlider products={relatedProducts} salePriceMap={relatedSalePrices} />
          </div>
        )}
      </div>
    </>
  )
}
