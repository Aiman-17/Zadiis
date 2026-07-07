import type { Page } from '@playwright/test'

/**
 * Fetch the first order id for data-dependent admin tests.
 * Only works in the `admin` project (relies on the saved auth storageState).
 * Returns null when no orders exist or the API shape is unexpected —
 * callers should `test.skip(!id, 'no orders in DB')`.
 */
export async function getFirstOrderId(page: Page): Promise<string | null> {
  try {
    const res = await page.request.get('/api/admin/orders')
    if (!res.ok()) return null
    const data = await res.json()
    const orders = Array.isArray(data) ? data : data?.orders
    if (!Array.isArray(orders) || orders.length === 0) return null
    return orders[0]?.id ?? null
  } catch {
    return null
  }
}
