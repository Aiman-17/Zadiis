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

function getCardBadge(sp: SaleProductFull, recentIds: Set<string>): string | undefined {
  if (!sp.products) return undefined
  const stock = getTotalStock(sp.products)
  if (stock <= 5 && stock > 0) return 'LIMITED STOCK'
  if (recentIds.has(sp.product_id)) return 'JUST DROPPED'
  if (sp.products.is_bestseller) return 'CUSTOMER FAVORITE'
  return undefined
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
      .single()

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
  const recentIds = new Set(sortedByRecency.slice(0, 3).map(sp => sp.product_id))

  // Three non-overlapping groups — score-based best sellers, fall back to is_bestseller flag
  const scoredSps = [...saleProducts].sort(
    (a, b) => (b.products?.best_seller_score || 0) - (a.products?.best_seller_score || 0)
  )
  const hasScores = saleProducts.some(sp => (sp.products?.best_seller_score || 0) > 0)
  const bestSellerSps = hasScores
    ? scoredSps.filter(sp => (sp.products?.best_seller_score || 0) > 0).slice(0, 4)
    : saleProducts.filter(sp => sp.products?.is_bestseller)
  const bestSellerIds = new Set(bestSellerSps.map(sp => sp.product_id))

  const newDropsSps = sortedByRecency
    .filter(sp => !bestSellerIds.has(sp.product_id))
    .slice(0, 4)
  const newDropIds = new Set(newDropsSps.map(sp => sp.product_id))

  const remainingSps = saleProducts.filter(
    sp => !bestSellerIds.has(sp.product_id) && !newDropIds.has(sp.product_id)
  )

  return (
    <div style={{ backgroundColor: '#FFF8F2', minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section className="py-16 px-4 text-center" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <p className="text-xs uppercase tracking-widest mb-4" style={{ color: '#C62828', letterSpacing: '0.3em' }}>
          Exclusive Sale Event
        </p>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          {sale.title}
        </h1>
        {maxDiscount > 0 && (
          <p className="text-2xl font-light mb-2" style={{ color: '#A68B6E' }}>
            Up to {maxDiscount}% Off
          </p>
        )}
        {sale.description && (
          <p className="mb-4 max-w-xl mx-auto" style={{ color: '#D1D5DB' }}>{sale.description}</p>
        )}
        {hasFreeDelivery && (
          <p className="text-sm mb-5 font-medium" style={{ color: '#10B981' }}>
            ✓ Free Delivery on All Sale Orders
          </p>
        )}
        {sale.ends_at && (
          <div className="mb-8">
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
      <div className="py-3 px-4 text-center border-b" style={{ borderColor: '#F0E4D4' }}>
        <p className="text-sm font-medium" style={{ color: '#1C1C1C' }}>
          ⚡ Sale stock will not be restocked — Grab yours before it&apos;s gone
        </p>
      </div>

      {/* ── Best Sellers on Sale ── */}
      {bestSellerSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-12 pb-6">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Best Sellers</h2>
            <span className="text-xs font-bold uppercase tracking-widest" style={{ color: '#C62828' }}>Going Fast</span>
          </div>
          <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>Our most-loved styles, now at sale prices</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {bestSellerSps.slice(0, 4).map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
                badge={getCardBadge(sp, recentIds) ?? 'CUSTOMER FAVORITE'}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── New Sale Drops ── */}
      {newDropsSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-8 pb-6">
          <h2 className="text-2xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>New Sale Drops</h2>
          <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>Freshly added to the sale</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {newDropsSps.map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
                badge={getCardBadge(sp, recentIds) ?? 'JUST DROPPED'}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── All Remaining Sale Products ── */}
      <div id="sale-products" />
      {remainingSps.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pt-8 pb-12">
          <h2 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>All Sale Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {remainingSps.map(sp => (
              <ProductCard
                key={sp.product_id}
                product={sp.products as Product}
                salePrice={sp.sale_price}
                badge={getCardBadge(sp, recentIds)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── You Might Also Love ── */}
      {relatedProducts.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-12 border-t" style={{ borderColor: '#E8DDD4' }}>
          <h2 className="text-2xl mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>You Might Also Love</h2>
          <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>From our full collection</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
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
