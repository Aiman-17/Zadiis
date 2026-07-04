import { supabase } from './supabase/client'
import { supabaseAdmin } from './supabase/server'
import type { Product } from '@/types'
import { getBestSellers, getTrending, getMerchandisingContext } from './merchandising'
import { getJustDropped, getJustDroppedIds } from './merchandising-server'
import { getEffectiveStock } from './stock'

function getPKTDate(): string {
  const now = new Date()
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

let _saleCache: { ids: string[]; ts: number } | null = null

async function getActiveSaleExcludeIds(): Promise<string[]> {
  if (_saleCache && Date.now() - _saleCache.ts < 30_000) return _saleCache.ids
  const now = new Date().toISOString()
  const { data: sale } = await supabaseAdmin
    .from('sales')
    .select('id')
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .maybeSingle()
  if (!sale) { _saleCache = { ids: [], ts: Date.now() }; return [] }
  const { data: sps } = await supabaseAdmin
    .from('sale_products')
    .select('product_id')
    .eq('sale_id', sale.id)
  const ids = (sps || []).map((sp: { product_id: string }) => sp.product_id)
  _saleCache = { ids, ts: Date.now() }
  return ids
}

export async function getProducts(filters?: {
  minPrice?: number
  maxPrice?: number
  size?: string
  type?: string
  q?: string
  category?: string
  tab?: string
}) {
  const isSearch = !!filters?.q
  const isTab = !!filters?.tab

  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)

  // Browsing without tab/search: hide new arrivals + sale products (they have dedicated sections).
  // Tab or search: bypass those exclusions — apply the tab's own conditions instead.
  if (!isSearch && !isTab) {
    const excludeIds = await getActiveSaleExcludeIds()
    query = query.eq('is_new_arrival', false)
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }
  }

  // Tab filter — each tab adds its own DB conditions and sort order
  let tabOrdered = false
  if (filters?.tab) {
    switch (filters.tab) {
      case 'trending': {
        // Same qualifying set as every other page (single source of truth —
        // specs/003-merchandising-badges-v2) — composes with search/price/
        // category filters via id membership rather than re-deriving a
        // separate threshold here.
        const { trendingIds } = await getMerchandisingContext()
        query = query.in('id', trendingIds.size > 0 ? [...trendingIds] : ['00000000-0000-0000-0000-000000000000'])
        break
      }
      case 'new-arrivals': {
        const today = getPKTDate()
        query = query
          .eq('is_new_arrival', true)
          .gt('stock_quantity', 0)
          .or(`new_arrival_start.is.null,new_arrival_start.lte.${today}`)
          .or(`new_arrival_end.is.null,new_arrival_end.gte.${today}`)
        break
      }
      case 'just-dropped': {
        const restockedIds = await getJustDroppedIds()
        query = query.gt('stock_quantity', 0).in('id', restockedIds.length > 0 ? restockedIds : ['00000000-0000-0000-0000-000000000000'])
        break
      }
      case 'best-sellers': {
        const { bestSellerIds } = await getMerchandisingContext()
        query = query.in('id', bestSellerIds.size > 0 ? [...bestSellerIds] : ['00000000-0000-0000-0000-000000000000'])
        tabOrdered = true
        break
      }
      case 'last-chance': {
        // BUG-004: stock_quantity alone can drift from the true variant
        // stock — filter/sort on effective stock instead of the raw field
        // (same fix as getLastChanceProducts() below).
        const lastChanceIds = (await lastChanceQualifying()).map(p => p.id)
        query = query.in('id', lastChanceIds.length > 0 ? lastChanceIds : ['00000000-0000-0000-0000-000000000000'])
        tabOrdered = true
        break
      }
    }
  }

  if (filters?.category) query = query.eq('product_category', filters.category)
  if (filters?.q) {
    const term = filters.q.replace(/'/g, "''")
    query = query.or(
      `name.ilike.%${term}%,description.ilike.%${term}%,product_category.ilike.%${term}%,collection_name.ilike.%${term}%`
    )
  }
  if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice)
  if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)

  if (filters?.size) {
    query = query.contains('sizes', [filters.size])
  }

  if (filters?.type === 'unstitched') {
    // sizes IS NULL (no sizes entered) OR empty array OR contains "Unstitched"
    // Note: no double-quotes inside {} — they break PostgREST parsing inside or()
    query = query.or('sizes.is.null,sizes.eq.{},sizes.cs.{Unstitched}')
  } else if (filters?.type === 'stitched') {
    query = query
      .not('sizes', 'is', null)
      .not('sizes', 'cs', '{Unstitched}')
      .not('sizes', 'eq', '{}')
  }

  // Default sort: newest first — only applied when tab hasn't set its own order
  if (!tabOrdered) query = query.order('created_at', { ascending: false })

  const { data, error } = await query
  if (error) throw error

  return data as Product[]
}

export async function getProductBySlug(slug: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) throw error
  return data as Product
}

export async function getJustDroppedProducts(limit = 4) {
  // Delegates to the shared merchandising computation (single source of
  // truth — see specs/003-merchandising-badges-v2). Restock-event based,
  // not created_at based.
  return getJustDropped(limit)
}

export async function getNewArrivalProducts(limit = 8) {
  const today = getPKTDate()
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_new_arrival', true)
    .gt('stock_quantity', 0)
    .or(`new_arrival_start.is.null,new_arrival_start.lte.${today}`)
    .or(`new_arrival_end.is.null,new_arrival_end.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []) as Product[]
}

/**
 * Featured — merchant-controlled promotion (US5), independent of and with
 * no effect on Best Seller/Trending. Mirrors getNewArrivalProducts()'s
 * optional date-window pattern exactly.
 */
export async function getFeaturedProducts(limit = 6) {
  const today = getPKTDate()
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_featured', true)
    .gt('stock_quantity', 0)
    .or(`featured_start.is.null,featured_start.lte.${today}`)
    .or(`featured_end.is.null,featured_end.gte.${today}`)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data || []) as Product[]
}

export async function getBestsellerProducts(limit = 6) {
  // Delegates to the shared merchandising computation (single source of
  // truth — see specs/003-merchandising-badges-v2). Category-relative,
  // minimum-sales-gated; no longer falls back to the is_bestseller flag.
  return getBestSellers(limit)
}

/**
 * Products qualifying for Last Chance (effective stock 1-3), sorted
 * scarcest-first. Fetches the full active catalog and filters/sorts on
 * getEffectiveStock() rather than the raw stock_quantity column — that
 * column can drift stale relative to variant_stock (BUG-004), which
 * previously both hid an in-stock product from this section and let the
 * same drift block real orders in checkout.
 */
async function lastChanceQualifying(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
  if (error) throw error
  return ((data || []) as Product[])
    .filter(p => { const s = getEffectiveStock(p); return s > 0 && s <= 3 })
    .sort((a, b) => getEffectiveStock(a) - getEffectiveStock(b))
}

export async function getLastChanceProducts(limit = 4) {
  return (await lastChanceQualifying()).slice(0, limit)
}

export async function getTrendingProducts(limit = 4) {
  // Delegates to the shared merchandising computation (single source of
  // truth — see specs/003-merchandising-badges-v2). Fully automatic,
  // category-relative; no longer reads the is_trending flag.
  return getTrending(limit)
}
