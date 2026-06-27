import { supabaseAdmin } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import Link from 'next/link'
import type { Metadata } from 'next'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'New Arrivals | ZADIIS',
  description: 'Shop the latest new arrivals at ZADIIS — fresh seasonal launches and new fashion collections.',
}

export default async function NewArrivalsPage() {
  const today = new Date().toISOString().split('T')[0]

  const { data } = await supabaseAdmin
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_new_arrival', true)
    .gt('stock_quantity', 0)
    .or(`new_arrival_start.is.null,new_arrival_start.lte.${today}`)
    .or(`new_arrival_end.is.null,new_arrival_end.gte.${today}`)
    .order('new_arrival_start', { ascending: false })

  const products = (data || []) as Product[]

  // Group by collection name
  const collections = Array.from(
    new Set(products.map(p => p.collection_name || 'New Arrivals'))
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#A68B6E', letterSpacing: '0.3em' }}>Fresh Drops</p>
        <h1 className="text-3xl md:text-4xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>New Arrivals</h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {products.length > 0
            ? `${products.length} new style${products.length !== 1 ? 's' : ''} — freshly launched`
            : 'New collections coming soon.'}
        </p>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-6">No new arrivals right now — check back soon.</p>
          <Link
            href="/shop"
            className="inline-block text-sm font-medium uppercase tracking-widest px-8 py-2.5 border transition-colors"
            style={{ borderColor: '#1C1C1C', color: '#1C1C1C' }}
          >
            Browse All Products
          </Link>
        </div>
      ) : collections.length > 1 ? (
        /* Multiple collections — group by collection name */
        <div className="space-y-12">
          {collections.map(col => {
            const colProducts = products.filter(p => (p.collection_name || 'New Arrivals') === col)
            return (
              <div key={col}>
                <div className="flex items-center gap-4 mb-6">
                  <h2 className="text-xl font-medium" style={{ fontFamily: 'Playfair Display, serif' }}>{col}</h2>
                  <div className="flex-1 border-t" style={{ borderColor: '#E8DDD4' }} />
                  <span className="text-xs" style={{ color: '#9CA3AF' }}>{colProducts.length} styles</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {colProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Single collection — plain grid */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
