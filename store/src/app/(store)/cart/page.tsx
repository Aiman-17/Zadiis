import CartClient from './CartClient'
import { getTrendingProducts } from '@/lib/products'
import type { Product } from '@/types'

export default async function CartPage() {
  let suggestions: Product[] = []
  try {
    suggestions = await getTrendingProducts(4)
    // Fall back to recent products if no trending
    if (suggestions.length === 0) {
      const { getProducts } = await import('@/lib/products')
      suggestions = (await getProducts()).slice(0, 4)
    }
  } catch {
    // Supabase not configured
  }

  return <CartClient suggestions={suggestions} />
}
