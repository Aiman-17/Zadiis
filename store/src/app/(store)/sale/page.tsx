import { supabaseAdmin } from '@/lib/supabase/server'
import ProductCard from '@/components/products/ProductCard'
import SaleCountdown from '@/components/products/SaleCountdown'
import type { Sale, SaleProduct, Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function SalePage() {
  let sale: (Sale & { sale_products: (SaleProduct & { products: Product })[] }) | null = null
  try {
    const { data } = await supabaseAdmin
      .from('sales')
      .select('*, sale_products(product_id, sale_price, products(*))')
      .eq('is_active', true)
      .single()
    sale = data
  } catch {
    // DB error — show graceful fallback
  }

  if (!sale) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-3xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>No Active Sale</h1>
        <p className="text-gray-500">Check back soon for our next sale event!</p>
      </div>
    )
  }

  const saleProducts = (sale.sale_products ?? []) as (SaleProduct & { products: Product })[]

  return (
    <div>
      {/* Sale header */}
      <div className="text-center py-12 px-4" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#A68B6E' }}>Limited Time</p>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>{(sale as Sale).title}</h1>
        {(sale as Sale).description && (
          <p className="text-gray-300 mb-6 max-w-xl mx-auto">{(sale as Sale).description}</p>
        )}
        {(sale as Sale).ends_at && (
          <SaleCountdown endsAt={(sale as Sale).ends_at!} />
        )}
      </div>

      {/* Products */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {saleProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {saleProducts.map(sp => (
              <ProductCard key={sp.product_id} product={sp.products} salePrice={sp.sale_price} />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-10">Sale products coming soon.</p>
        )}
      </div>
    </div>
  )
}
