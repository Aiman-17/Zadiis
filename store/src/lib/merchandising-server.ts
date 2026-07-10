import { supabase } from './supabase/client'
import { supabaseAdmin } from './supabase/server'
import type { Product } from '@/types'

/**
 * Just Dropped — based on the most recent restock event (stock_movements
 * with reason='restock'), not product creation date (FR-009). A product
 * restocked long after it was first listed now correctly appears here.
 *
 * Kept separate from merchandising.ts (which is client-safe) because this
 * needs supabaseAdmin — stock_movements RLS restricts reads to service_role
 * (supabase/stock-ledger.sql), and supabaseAdmin throws at module-eval time
 * if imported into a browser bundle (no service-role key client-side).
 * Server-only: import this from server components and API routes only,
 * never from a 'use client' file.
 */

// Just Dropped freshness window — unchanged from the prior created_at-based
// version (research.md #5); only the timestamp source changes (US4).
const JUST_DROPPED_WINDOW_MS = 72 * 60 * 60 * 1000

/**
 * IDs of products restocked within the freshness window, most-recent first
 * — the raw set the Shop tab's 'just-dropped' filter composes with search/
 * price/category via `.in()`, and getJustDropped() below caps for display.
 */
export async function getJustDroppedIds(): Promise<string[]> {
  const since = new Date(Date.now() - JUST_DROPPED_WINDOW_MS).toISOString()
  const { data: movements, error } = await supabaseAdmin
    .from('stock_movements')
    .select('product_id, created_at')
    .eq('reason', 'restock')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) throw error
  return [...new Set((movements || []).map(m => m.product_id as string))]
}

export async function getJustDropped(limit = 4): Promise<Product[]> {
  const recentlyRestockedIds = await getJustDroppedIds()
  if (recentlyRestockedIds.length === 0) return []

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .in('id', recentlyRestockedIds)
  if (productsError) throw productsError

  const restockOrder = new Map(recentlyRestockedIds.map((id, i) => [id, i]))
  return ((products || []) as Product[])
    .sort((a, b) => (restockOrder.get(a.id) ?? 0) - (restockOrder.get(b.id) ?? 0))
    .slice(0, limit)
}
