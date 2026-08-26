/**
 * Single source of truth for "how much stock does this product actually
 * have" — prefers the sum of variant_stock (per-color/size counts) over the
 * aggregate stock_quantity field whenever variants are tracked, since the
 * two can drift apart (BUG-004: stale stock_quantity from orders placed
 * before the BUG-003 decrement_stock fix). Falls back to stock_quantity
 * for products with no variant tracking.
 *
 * Client-safe — no Supabase import, pure computation on fields already in
 * hand, importable from both server code and 'use client' components.
 */
export function getEffectiveStock(product: {
  stock_quantity: number
  variant_stock?: Record<string, Record<string, number>> | null
}): number {
  const vs = product.variant_stock
  if (vs && Object.keys(vs).length > 0) {
    return Object.values(vs).reduce(
      (sum, sizes) => sum + Object.values(sizes).reduce((s, q) => s + (q as number), 0),
      0
    )
  }
  return product.stock_quantity
}
