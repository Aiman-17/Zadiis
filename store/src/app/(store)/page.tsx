import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/products/ProductCard'
import { getFeaturedProducts, getBestsellerProducts, getTrendingProducts, getLastChanceProducts, getJustDroppedProducts } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Truck, RefreshCw, Shield, Lock, Star } from 'lucide-react'

async function getHeroImage(): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('store_settings')
      .select('value')
      .eq('key', 'hero_image')
      .single()
    return data?.value || ''
  } catch {
    return ''
  }
}

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  let justDropped: Awaited<ReturnType<typeof getJustDroppedProducts>> = []
  let bestSellers: Awaited<ReturnType<typeof getBestsellerProducts>> = []
  let trending: Awaited<ReturnType<typeof getTrendingProducts>> = []
  let lastChance: Awaited<ReturnType<typeof getLastChanceProducts>> = []
  let heroImage = ''
  let activeSale: { title: string; description: string | null; ends_at: string | null } | null = null
  let salePriceMap: Record<string, number> = {}
  try {
    const [featuredData, justDroppedData, bestSellersData, trendingData, lastChanceData, heroData, saleData] = await Promise.all([
      getFeaturedProducts(6),
      getJustDroppedProducts(4),
      getBestsellerProducts(6),
      getTrendingProducts(4),
      getLastChanceProducts(4),
      getHeroImage(),
      supabaseAdmin
        .from('sales')
        .select('id, title, description, ends_at')
        .eq('is_active', true)
        .single()
        .then(r => r.data),
    ])
    featured = featuredData
    justDropped = justDroppedData
    bestSellers = bestSellersData
    trending = trendingData
    lastChance = lastChanceData
    heroImage = heroData
    activeSale = saleData

    // Build sale price map so home page cards show discounted prices
    if (saleData?.id) {
      const { data: spData } = await supabaseAdmin
        .from('sale_products')
        .select('product_id, sale_price')
        .eq('sale_id', saleData.id)
      if (spData) {
        salePriceMap = Object.fromEntries(spData.map((sp: { product_id: string; sale_price: number }) => [sp.product_id, sp.sale_price]))
      }
    }
  } catch {
    // Supabase not configured yet — show empty state
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center text-center overflow-hidden" style={{ minHeight: '85vh', backgroundColor: '#E8DDD4' }}>
        {heroImage && (
          <Image
            src={heroImage}
            alt="ZADIIS Hero Banner"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div
          className="relative z-10 px-4"
          style={heroImage ? { backgroundColor: 'rgba(0,0,0,0.35)', padding: '40px 32px', borderRadius: '8px' } : {}}
        >
          <p className="text-sm uppercase tracking-widest mb-4" style={{ color: heroImage ? '#F5DEB3' : '#A68B6E', letterSpacing: '0.3em' }}>New Collection</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif', color: heroImage ? 'white' : 'inherit' }}>
            Dressed in<br />Confidence
          </h1>
          <p className="mb-8 max-w-md mx-auto" style={{ color: heroImage ? '#E5E7EB' : '#4B5563' }}>
            Discover women&apos;s fashion crafted for the modern Pakistani woman.
          </p>
          <Button asChild size="lg" className="text-white px-10 rounded-none uppercase tracking-widest text-sm" style={{ backgroundColor: '#1C1C1C' }}>
            <Link href="/shop">Shop Now</Link>
          </Button>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
        <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} style={{ color: '#A68B6E' }} /> Free delivery over PKR 10,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} style={{ color: '#A68B6E' }} /> Easy 7-day returns</div>
          <div className="flex items-center gap-2"><Shield size={18} style={{ color: '#A68B6E' }} /> Secure payments</div>
          <div className="flex items-center gap-2"><Lock size={18} style={{ color: '#A68B6E' }} /> 100% authentic products</div>
          <div className="flex items-center gap-2"><Star size={18} style={{ color: '#A68B6E' }} /> 500+ happy customers</div>
        </div>
      </section>

      {/* Sale Banner — only shown when a sale is active */}
      {activeSale && (
        <section className="py-5 px-4 text-center" style={{ backgroundColor: '#1C1C1C' }}>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#EF4444' }} />
            <p className="text-xs uppercase tracking-widest" style={{ color: '#A68B6E', letterSpacing: '0.25em' }}>Limited Time Sale</p>
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#EF4444' }} />
          </div>
          <p className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            {activeSale.title}
            {activeSale.description && (
              <span className="text-base font-normal text-gray-300"> — {activeSale.description}</span>
            )}
          </p>
          <Link
            href="/sale"
            className="inline-block text-sm font-semibold uppercase tracking-widest px-6 py-2 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#DC2626', color: 'white' }}
          >
            Shop the Sale →
          </Link>
        </section>
      )}

      {/* Just Dropped — only shown when products < 7 days old exist */}
      {justDropped.length >= 1 && (
        <section className="max-w-6xl mx-auto px-4 py-10" style={{ borderTop: '1px solid #E8DDD4' }}>
          <div className="flex items-baseline justify-center gap-3 mb-6">
            <h2 className="text-2xl md:text-3xl" style={{ fontFamily: 'Playfair Display, serif' }}>Just Dropped</h2>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#1C1C1C', letterSpacing: '0.2em' }}>New In</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {justDropped.map(product => (
              <ProductCard key={product.id} product={product} salePrice={salePriceMap[product.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Now — only shown when 2+ trending products exist */}
      {trending.length >= 2 && (
        <section className="max-w-6xl mx-auto px-4 py-10" style={{ borderTop: '1px solid #E8DDD4' }}>
          <div className="flex items-baseline justify-center gap-3 mb-6">
            <h2 className="text-2xl md:text-3xl" style={{ fontFamily: 'Playfair Display, serif' }}>Trending Now</h2>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C62828' }}>Hot This Week</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trending.map(product => (
              <ProductCard key={product.id} product={product} badge="TRENDING" salePrice={salePriceMap[product.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl md:text-3xl text-center mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>New Arrivals</h2>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} salePrice={salePriceMap[product.id]} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Products coming soon.</p>
        )}
        <div className="text-center mt-8">
          <Button asChild variant="outline" className="rounded-none uppercase tracking-widest text-sm px-10" style={{ borderColor: '#1C1C1C' }}>
            <Link href="/shop">View All</Link>
          </Button>
        </div>
      </section>

      {/* Best Sellers — only shown when 2+ exist */}
      {bestSellers.length >= 2 && (
        <section className="max-w-6xl mx-auto px-4 py-10" style={{ borderTop: '1px solid #E8DDD4' }}>
          <h2 className="text-2xl md:text-3xl text-center mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Best Sellers</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {bestSellers.map(product => (
              <ProductCard key={product.id} product={product} badge="BESTSELLER" salePrice={salePriceMap[product.id]} />
            ))}
          </div>
        </section>
      )}

      {/* Last Chance — stock ≤ 3, shown when at least 1 product qualifies */}
      {lastChance.length >= 1 && (
        <section className="max-w-6xl mx-auto px-4 py-10" style={{ borderTop: '1px solid #E8DDD4' }}>
          <div className="flex items-baseline justify-center gap-3 mb-6">
            <h2 className="text-2xl md:text-3xl" style={{ fontFamily: 'Playfair Display, serif' }}>Last Chance</h2>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C62828' }}>Almost Gone</span>
          </div>
          <p className="text-center text-sm mb-6" style={{ color: '#9CA3AF' }}>
            These styles are almost sold out — grab yours before they&apos;re gone.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {lastChance.map(product => (
              <ProductCard key={product.id} product={product} salePrice={salePriceMap[product.id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
