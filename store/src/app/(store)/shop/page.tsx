export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import ProductCard from '@/components/products/ProductCard'
import ProductFilters from '@/components/products/ProductFilters'
import ShopSearchBar from '@/components/products/ShopSearchBar'
import ProductSectionTabs from '@/components/products/ProductSectionTabs'
import { getProducts } from '@/lib/products'
import { getMerchandisingContext } from '@/lib/merchandising'
import { supabaseAdmin } from '@/lib/supabase/server'

async function ProductGrid({ searchParams }: { searchParams: { size?: string; min?: string; max?: string; type?: string; q?: string; cat?: string; tab?: string } }) {
  let products: Awaited<ReturnType<typeof getProducts>> = []
  let bestSellerIds = new Set<string>()
  let trendingIds = new Set<string>()
  let salePriceMap: Record<string, number> = {}
  try {
    const [productsResult, context] = await Promise.all([
      getProducts({
        size: searchParams.size,
        minPrice: searchParams.min ? Number(searchParams.min) : undefined,
        maxPrice: searchParams.max ? Number(searchParams.max) : undefined,
        type: searchParams.type,
        q: searchParams.q,
        category: searchParams.cat,
        tab: searchParams.tab,
      }),
      getMerchandisingContext(),
    ])
    products = productsResult
    bestSellerIds = context.bestSellerIds
    trendingIds = context.trendingIds

    // Sale products can surface here via search or the 'sale' tab (they're
    // excluded from default browsing) — fetch their sale prices so the
    // discount badge renders, same as everywhere else sale prices are shown.
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('id')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle()
    if (sale && products.length > 0) {
      const { data: sps } = await supabaseAdmin
        .from('sale_products')
        .select('product_id, sale_price')
        .eq('sale_id', sale.id)
        .in('product_id', products.map(p => p.id))
      salePriceMap = Object.fromEntries((sps || []).map(sp => [sp.product_id, sp.sale_price]))
    }
  } catch (e) {
    console.error('ShopPage data fetch failed:', e)
  }

  if (products.length === 0) {
    return <p className="text-gray-500 py-10">No products found. Try adjusting your filters.</p>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {products.map(product => {
        const badge = bestSellerIds.has(product.id) ? 'BESTSELLER' : trendingIds.has(product.id) ? 'TRENDING' : undefined
        return <ProductCard key={product.id} product={product} badge={badge} salePrice={salePriceMap[product.id]} />
      })}
    </div>
  )
}

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ size?: string; min?: string; max?: string; type?: string; q?: string; cat?: string; tab?: string }> }) {
  const params = await searchParams

  let hasSale = false
  try {
    const { data: sale } = await supabaseAdmin
      .from('sales')
      .select('id')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle()
    hasSale = !!sale
  } catch (e) {
    console.error('ShopPage data fetch failed:', e)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Women&apos;s Collection</h1>
      <Suspense>
        <ProductSectionTabs hasSale={hasSale} />
      </Suspense>

      <div className="mt-4">
        <Suspense>
          <ShopSearchBar />
        </Suspense>
      </div>
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
