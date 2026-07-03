import type { Page } from '@playwright/test'

type AdminProduct = {
  id: string
  slug: string
  name: string
  is_active?: boolean
  stock_quantity: number
  variant_stock: Record<string, Record<string, number>> | null
}

export type ColorOnlyVariant = {
  productId: string
  slug: string
  name: string
  color: string
  stockQuantity: number
  variantQuantity: number
}

/**
 * Find a real, currently-active product whose variant_stock tracks color but
 * not size — i.e. every size key under the color is the "_" sentinel
 * (BUG-003: specs/001-e2e-test-suite/bugs/BUG-003-color-only-variant-stock-never-decrements.md).
 * Requires admin API access (run under the `admin` project's storageState).
 * Returns null if no such product currently has stock to safely order.
 */
export async function findColorOnlyVariant(page: Page): Promise<ColorOnlyVariant | null> {
  const res = await page.request.get('/api/admin/products')
  if (!res.ok()) return null
  const data = await res.json()
  const products: AdminProduct[] = Array.isArray(data) ? data : data?.products ?? []

  for (const p of products) {
    if (p.is_active === false) continue
    const vs = p.variant_stock
    if (!vs || Object.keys(vs).length === 0) continue
    for (const [color, sizes] of Object.entries(vs)) {
      const sizeKeys = Object.keys(sizes)
      if (sizeKeys.length === 1 && sizeKeys[0] === '_' && sizes['_'] >= 1) {
        return {
          productId: p.id,
          slug: p.slug,
          name: p.name,
          color,
          stockQuantity: p.stock_quantity,
          variantQuantity: sizes['_'],
        }
      }
    }
  }
  return null
}

/** Re-fetch a single product's current stock fields by id. */
export async function getProductStock(
  page: Page,
  productId: string
): Promise<{ stockQuantity: number; variantStock: Record<string, Record<string, number>> | null } | null> {
  const res = await page.request.get('/api/admin/products')
  if (!res.ok()) return null
  const data = await res.json()
  const products: AdminProduct[] = Array.isArray(data) ? data : data?.products ?? []
  const product = products.find(p => p.id === productId)
  if (!product) return null
  return { stockQuantity: product.stock_quantity, variantStock: product.variant_stock }
}
