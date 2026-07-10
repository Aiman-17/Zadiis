import { supabase } from './supabase/client'
import { getEffectiveStock } from './stock'
import type { Product } from '@/types'

/**
 * Single source of truth for Best Seller and Trending qualification —
 * every consuming page (Shop, Homepage, Admin Dashboard, Admin Analytics)
 * must call these instead of deriving its own threshold. See
 * specs/003-merchandising-badges-v2/ for the audit that found four
 * independently-duplicated, disagreeing definitions of the same concepts.
 *
 * Client-safe: only ever touches the public anon Supabase client, so this
 * module can be imported from both server components and 'use client'
 * components (AnalyticsClient, DashboardCharts, admin product list) without
 * pulling the service-role client into the browser bundle.
 *
 * Just Dropped lives in merchandising-server.ts instead — it needs
 * privileged access to the stock_movements table (RLS-restricted to
 * service_role) and must never be imported from a client component.
 */

// A product must clear this many genuine sales before Best Seller
// eligibility is even considered. Verified against live catalog data
// (research.md #2): excludes a 1-unit sellout while including a genuine
// 3-unit repeat seller. Revisit upward as order volume grows.
export const MIN_SALES_FOR_BESTSELLER = 2

// Display caps — matches the homepage section size already in use
// throughout products.ts, sized for the current ~7-product catalog.
// Revisit upward as the catalog grows (research.md #3).
export const BESTSELLER_DISPLAY_CAP = 4
export const TRENDING_DISPLAY_CAP = 4

/**
 * Normalize each categorized product's raw score to a 0-1 scale relative to
 * the strongest same-category performer, so a strong seller in a low-volume
 * category can compete evenly with one in a high-volume category in a single
 * merged ranking — without building separate per-category leaderboards
 * (explicitly deferred, FR-016). Uncategorized products keep their raw score
 * (compared against the full catalog), per spec's "falling back to global
 * comparison when uncategorized."
 */
function normalizeByCategory(products: Product[], scoreKey: 'best_seller_score' | 'trending_score'): Map<string, number> {
  const categoryMax = new Map<string, number>()
  for (const p of products) {
    const cat = p.product_category
    if (!cat) continue
    const score = p[scoreKey] || 0
    if (score > (categoryMax.get(cat) ?? 0)) categoryMax.set(cat, score)
  }

  const relative = new Map<string, number>()
  for (const p of products) {
    const raw = p[scoreKey] || 0
    const cat = p.product_category
    if (cat) {
      const max = categoryMax.get(cat) ?? 0
      relative.set(p.id, max > 0 ? raw / max : 0)
    } else {
      relative.set(p.id, raw)
    }
  }
  return relative
}

/**
 * Pure ranking — Best Seller. Gated by MIN_SALES_FOR_BESTSELLER, in-stock
 * only, category-relative, capped. Never pads with non-qualifying products
 * (FR-005). Safe to call client-side on a `products` prop already in hand.
 */
export function rankBestSellers(products: Product[], limit: number = BESTSELLER_DISPLAY_CAP): Product[] {
  const qualifying = products.filter(p => p.stock_quantity > 0 && (p.total_sold || 0) >= MIN_SALES_FOR_BESTSELLER)
  const relative = normalizeByCategory(qualifying, 'best_seller_score')
  return qualifying
    .sort((a, b) => (relative.get(b.id) ?? 0) - (relative.get(a.id) ?? 0))
    .slice(0, limit)
}

/**
 * Pure ranking — Trending. Fully automatic (no manual flag read anywhere),
 * in-stock only, category-relative, capped.
 */
export function rankTrending(products: Product[], limit: number = TRENDING_DISPLAY_CAP): Product[] {
  const qualifying = products.filter(p => p.stock_quantity > 0 && (p.trending_score || 0) > 0)
  const relative = normalizeByCategory(qualifying, 'trending_score')
  return qualifying
    .sort((a, b) => (relative.get(b.id) ?? 0) - (relative.get(a.id) ?? 0))
    .slice(0, limit)
}

/**
 * The set of product IDs currently qualifying for each badge — for pages
 * that render many ProductCards and need to know, per-card, whether to show
 * a badge, without each card re-deriving its own threshold (FR-001).
 */
export function merchandisingIdSets(products: Product[]): { bestSellerIds: Set<string>; trendingIds: Set<string> } {
  return {
    bestSellerIds: new Set(rankBestSellers(products).map(p => p.id)),
    trendingIds: new Set(rankTrending(products).map(p => p.id)),
  }
}

/**
 * Slow Mover consolidation (spec 006, US9). Previously triplicated in
 * AdminProductsClient.tsx, sales/new/page.tsx, and sales/[id]/edit/page.tsx
 * with a genuine disagreement, not just duplicated code: sales/new/page.tsx
 * excluded is_new_arrival products from the average-sell-through baseline,
 * while the other two included them — meaning the same product could
 * already be flagged Slow Mover in one admin surface and not another.
 *
 * This consolidation adopts the sales/new/page.tsx behavior (exclude
 * is_new_arrival from the baseline) as correct: a just-launched product's
 * necessarily-low sell-through shouldn't drag down the bar every other
 * product is judged against. See research.md Decision 9 for the full
 * reasoning — this is a deliberate behavior fix, not a neutral refactor.
 */
export function computeStoreAvgSellThrough(products: Product[]): number {
  const eligibleForAvg = products.filter(p => {
    if (p.is_new_arrival) return false
    const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
    return ageDays >= 15 && getEffectiveStock(p) > 0
  })
  if (eligibleForAvg.length === 0) return 0
  return eligibleForAvg.reduce((sum, p) => {
    const stock = getEffectiveStock(p)
    return sum + p.total_sold / (p.total_sold + stock)
  }, 0) / eligibleForAvg.length
}

/** A product qualifies as Slow Mover if it's at least 15 days old, in stock,
 * and its sell-through is less than half the store-wide average (computed
 * via computeStoreAvgSellThrough, above). If nothing has sold store-wide,
 * nothing is flagged. */
export function isSlowMover(p: Product, avgSellThrough: number): boolean {
  const ageDays = (Date.now() - new Date(p.created_at).getTime()) / 86400000
  if (ageDays < 15) return false
  const stock = getEffectiveStock(p)
  if (stock === 0 || avgSellThrough <= 0) return false
  return (p.total_sold / (p.total_sold + stock)) < avgSellThrough * 0.5
}

async function fetchActiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
  if (error) throw error
  return (data || []) as Product[]
}

/** Server-side fetch + rank in one call, for pages that don't already have a `products` array. */
export async function getBestSellers(limit: number = BESTSELLER_DISPLAY_CAP): Promise<Product[]> {
  return rankBestSellers(await fetchActiveProducts(), limit)
}

/** Server-side fetch + rank in one call, for pages that don't already have a `products` array. */
export async function getTrending(limit: number = TRENDING_DISPLAY_CAP): Promise<Product[]> {
  return rankTrending(await fetchActiveProducts(), limit)
}

/** Server-side fetch + rank in one call, for pages that don't already have a `products` array. */
export async function getMerchandisingContext(): Promise<{ bestSellerIds: Set<string>; trendingIds: Set<string> }> {
  return merchandisingIdSets(await fetchActiveProducts())
}
