import { supabaseAdmin } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import SaleCountdown from '@/components/products/SaleCountdown'
import type { Sale, SaleProduct, Product, Category } from '@/types'

export const dynamic = 'force-dynamic'

type SaleProductFull = SaleProduct & { products: Product & { categories?: Category } }

function getTotalStock(p: Product): number {
  const vs = p.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes as Record<string, number>).reduce((s, q) => s + q, 0), 0
    )
  }
  return p.stock_quantity
}

function sortByDiscount(sps: SaleProductFull[]): SaleProductFull[] {
  return [...sps].sort((a, b) => {
    const stockA = getTotalStock(a.products)
    const stockB = getTotalStock(b.products)
    if (stockA === 0 && stockB > 0) return 1
    if (stockA > 0 && stockB === 0) return -1
    const discA = a.products?.price ? (1 - a.sale_price / a.products.price) : 0
    const discB = b.products?.price ? (1 - b.sale_price / b.products.price) : 0
    return discB - discA
  })
}

function gridClass(count: number): string {
  if (count <= 2) return 'grid grid-cols-2 gap-4'
  if (count === 3) return 'grid grid-cols-2 md:grid-cols-3 gap-4'
  return 'grid grid-cols-2 md:grid-cols-4 gap-4'
}

export default async function SalePage() {
  let sale: Sale | null = null
  let saleProducts: SaleProductFull[] = []
  let relatedProducts: Product[] = []

  try {
    const { data } = await supabaseAdmin
      .from('sales')
      .select('*, sale_products(product_id, sale_price, created_at, products(*, categories(name, slug)))')
      .eq('is_active', true)
      .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
      .maybeSingle()

    if (data) {
      sale = data as unknown as Sale
      saleProducts = ((data as { sale_products: SaleProductFull[] }).sale_products ?? [])
        .filter(sp => sp.products)

      const saleIds = saleProducts.map(sp => sp.product_id)
      const { data: relData } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('is_bestseller', true)
        .limit(10)

      relatedProducts = ((relData || []) as Product[])
        .filter(p => !saleIds.includes(p.id))
        .slice(0, 6)
    }
  } catch {
    // graceful fallback
  }

  if (!sale) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>No Active Sale</h1>
        <p style={{ color: '#9CA3AF' }}>Check back soon for our next sale event.</p>
      </div>
    )
  }

  const maxDiscount = saleProducts.reduce((max, sp) => {
    if (!sp.products?.price) return max
    return Math.max(max, Math.round((1 - sp.sale_price / sp.products.price) * 100))
  }, 0)

  const hasFreeDelivery = sale.delivery_charge_override === 0

  const sortedByRecency = [...saleProducts].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )

  // Three non-overlapping groups
  const scoredSps = [...saleProducts].sort(
    (a, b) => (b.products?.best_seller_score || 0) - (a.products?.best_seller_score || 0)
  )
  const hasScores = saleProducts.some(sp => (sp.products?.best_seller_score || 0) > 0)
  const bestSellerSps = sortByDiscount(
    hasScores
      ? scoredSps.filter(sp => (sp.products?.best_seller_score || 0) > 0).slice(0, 4)
      : saleProducts.filter(sp => sp.products?.is_bestseller)
  )
  const bestSellerIds = new Set(bestSellerSps.map(sp => sp.product_id))

  const newDropsSps = sortByDiscount(
    sortedByRecency
      .filter(sp => !bestSellerIds.has(sp.product_id))
      .slice(0, 4)
  )
  const newDropIds = new Set(newDropsSps.map(sp => sp.product_id))

  const remainingSps = sortByDiscount(
    saleProducts.filter(
      sp => !bestSellerIds.has(sp.product_id) && !newDropIds.has(sp.product_id)
    )
  )

  return (
    <div style={{ backgroundColor: '#FFF8F2', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section className="py-12 px-4 text-center" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#C62828', letterSpacing: '0.3em' }}>
          Exclusive Sale Event
        </p>
        <h1 className="text-4xl md:text-5xl mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
          {sale.title}
        </h1>
        {maxDiscount > 0 && (
          <p className="text-2xl font-light mb-2" style={{ color: '#A68B6E' }}>
            Up to {maxDiscount}% Off
          </p>
        )}
        {hasFreeDelivery && (
          <p className="text-sm mb-4 font-medium" style={{ color: '#10B981' }}>
            ✓ Free Delivery on All Sale Orders
          </p>
        )}
        {sale.ends_at && (
          <div className="mb-6">
            <SaleCountdown endsAt={sale.ends_at} />
          </div>
        )}
        <a
          href="#sale-products"
          className="inline-block text-sm font-semibold uppercase tracking-widest px-8 py-3 transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'white', color: '#1C1C1C' }}
        >
          Shop the Sale ↓
        </a>
      </section>

      {/* ── Urgency Strip ── */}
      <div className="py-2.5 px-4 text-center border-b" style={{ borderColor: '#F0E4D4' }}>
        <p className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
          ⚡ Sale stock will not be restocked — Grab yours before it&apos;s gone
        </p>
      </div>

      {/* ── Best Sellers on Sale ── */}
      {bestSellerSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-8 pb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-xl" style={{ fontFamily: 'Playfair Display, serif' }}>Best Sellers</h2>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C62828' }}>Going Fast</span>
          </div>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>Our most-loved styles, now at sale prices</p>
          <div className={gridClass(Math.min(bestSellerSps.length, 4))}>
            {bestSellerSps.slice(0, 4).map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── New Sale Drops ── */}
      {newDropsSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-6 pb-4">
          <h2 className="text-xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale Drops</h2>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>Freshly added to the sale</p>
          <div className={gridClass(Math.min(newDropsSps.length, 4))}>
            {newDropsSps.map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All Remaining Sale Products ── */}
      <div id="sale-products" />
      {remainingSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-6 pb-8">
          <h2 className="text-xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>All Sale Products</h2>
          <div className={gridClass(Math.min(remainingSps.length, 4))}>
            {remainingSps.map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── You Might Also Love ── */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 border-t" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="text-xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>You Might Also Love</h2>
          <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>From our full collection</p>
          <div className={gridClass(Math.min(relatedProducts.length, 4))}>
            {relatedProducts.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                badge={p.is_bestseller ? 'BESTSELLER' : undefined}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
