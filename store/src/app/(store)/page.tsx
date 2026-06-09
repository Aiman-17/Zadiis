import Link from 'next/link'
import { Button } from '@/components/ui/button'
import ProductCard from '@/components/products/ProductCard'
import { getFeaturedProducts } from '@/lib/products'
import { Truck, RefreshCw, Shield } from 'lucide-react'

export default async function HomePage() {
  let featured: Awaited<ReturnType<typeof getFeaturedProducts>> = []
  try {
    featured = await getFeaturedProducts(6)
  } catch {
    // Supabase not configured yet — show empty state
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative flex items-center justify-center text-center overflow-hidden" style={{ minHeight: '85vh', backgroundColor: '#E8DDD4' }}>
        <div className="relative z-10 px-4">
          <p className="text-sm uppercase tracking-widest mb-4" style={{ color: '#A68B6E', letterSpacing: '0.3em' }}>New Collection</p>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
            Dressed in<br />Confidence
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Discover women&apos;s fashion crafted for the modern Pakistani woman.
          </p>
          <Button asChild size="lg" className="text-white px-10 rounded-none uppercase tracking-widest text-sm" style={{ backgroundColor: '#1C1C1C' }}>
            <Link href="/shop">Shop Now</Link>
          </Button>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-y bg-white py-4" style={{ borderColor: '#E8DDD4' }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-around gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2"><Truck size={18} style={{ color: '#A68B6E' }} /> Free delivery over PKR 2,000</div>
          <div className="flex items-center gap-2"><RefreshCw size={18} style={{ color: '#A68B6E' }} /> Easy returns</div>
          <div className="flex items-center gap-2"><Shield size={18} style={{ color: '#A68B6E' }} /> Secure payments</div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl md:text-3xl text-center mb-10" style={{ fontFamily: 'Playfair Display, serif' }}>New Arrivals</h2>
        {featured.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Products coming soon.</p>
        )}
        <div className="text-center mt-10">
          <Button asChild variant="outline" className="rounded-none uppercase tracking-widest text-sm px-10" style={{ borderColor: '#1C1C1C' }}>
            <Link href="/shop">View All</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
