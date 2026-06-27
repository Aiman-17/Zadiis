export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import ProductCard from '@/components/products/ProductCard'
import ProductFilters from '@/components/products/ProductFilters'
import ShopSearchBar from '@/components/products/ShopSearchBar'
import ProductSectionTabs from '@/components/products/ProductSectionTabs'
import { getProducts, getTrendingProducts, getNewArrivalProducts, getBestsellerProducts, getLastChanceProducts, getJustDroppedProducts } from '@/lib/products'
import { supabaseAdmin } from '@/lib/supabase/server'

async function ProductGrid({ searchParams }: { searchParams: { size?: string; min?: string; max?: string; type?: string; q?: string; cat?: string } }) {
  let products: Awaited<ReturnType<typeof getProducts>> = []
  try {
    products = await getProducts({
      size: searchParams.size,
      minPrice: searchParams.min ? Number(searchParams.min) : undefined,
      maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
      type: searchParams.type,
      q: searchParams.q,
      category: searchParams.cat,
    })
  } catch {
    // Supabase not configured yet
  }

  if (products.length === 0) {
    return <p className="text-gray-500 py-10">No products found. Try adjusting your filters.</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ size?: string; min?: string; max?: string; type?: string; q?: string; cat?: string }> }) {
  const params = await searchParams

  // Fetch curated sections for the tab strip
  let trending: Awaited<ReturnType<typeof getTrendingProducts>> = []
  let newArrivals: Awaited<ReturnType<typeof getNewArrivalProducts>> = []
  let justDropped: Awaited<ReturnType<typeof getJustDroppedProducts>> = []
  let bestSellers: Awaited<ReturnType<typeof getBestsellerProducts>> = []
  let lastChance: Awaited<ReturnType<typeof getLastChanceProducts>> = []
  let salePriceMap: Record<string, number> = {}

  try {
    const [t, na, jd, bs, lc, saleRes] = await Promise.all([
      getTrendingProducts(4),
      getNewArrivalProducts(4),
      getJustDroppedProducts(4),
      getBestsellerProducts(4),
      getLastChanceProducts(4),
      supabaseAdmin.from('sales').select('id').eq('is_active', true).maybeSingle(),
    ])
    trending = t; newArrivals = na; justDropped = jd; bestSellers = bs; lastChance = lc

    if (saleRes.data?.id) {
      const { data: spData } = await supabaseAdmin
        .from('sale_products')
        .select('product_id, sale_price')
        .eq('sale_id', saleRes.data.id)
      if (spData) {
        salePriceMap = Object.fromEntries(
          spData.map((sp: { product_id: string; sale_price: number }) => [sp.product_id, sp.sale_price])
        )
      }
    }
  } catch {
    // Supabase not configured yet
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Curated sections tab strip */}
      <ProductSectionTabs
        trending={trending}
        newArrivals={newArrivals}
        justDropped={justDropped}
        bestSellers={bestSellers}
        lastChance={lastChance}
        salePriceMap={salePriceMap}
      />

      {/* Full catalogue */}
      <h1 className="text-2xl mt-6 mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Women&apos;s Collection</h1>
      <Suspense>
        <ShopSearchBar />
      </Suspense>
      <div className="flex flex-col md:flex-row gap-8 mt-4">
        <aside className="shrink-0 md:w-56">
          <Suspense>
            <ProductFilters />
          </Suspense>
        </aside>
        <div className="flex-1">
          <Suspense fallback={<p className="text-gray-400">Loading products...</p>}>
            <ProductGrid searchParams={params} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
