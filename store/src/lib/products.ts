import { supabase } from './supabase/client'
import type { Product } from '@/types'

function getPKTDate(): string {
  const now = new Date()
  return new Date(now.getTime() + 5 * 60 * 60 * 1000).toISOString().split('T')[0]
}

let _saleCache: { ids: string[]; ts: number } | null = null

async function getActiveSaleExcludeIds(): Promise<string[]> {
  if (_saleCache && Date.now() - _saleCache.ts < 30_000) return _saleCache.ids
  const { data: sale } = await supabase
    .from('sales')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()
  if (!sale) { _saleCache = { ids: [], ts: Date.now() }; return [] }
  const { data: sps } = await supabase
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
}) {
  const isSearch = !!filters?.q

  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Browsing: hide new arrivals + sale products (they have dedicated sections).
  // Searching: return everything — customer typed a keyword, find it anywhere.
  if (!isSearch) {
    const excludeIds = await getActiveSaleExcludeIds()
    query = query.eq('is_new_arrival', false)
    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
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

  // Size and type filters applied at DB level — never pull the whole catalog into JS
  if (filters?.size) {
    query = query.contains('sizes', [filters.size])
  }

  if (filters?.type === 'unstitched') {
    query = query.or('sizes.eq.{},sizes.cs.{"Unstitched"}')
  } else if (filters?.type === 'stitched') {
    query = query.not('sizes', 'cs', '{"Unstitched"}').not('sizes', 'eq', '{}')
  }

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
  const h72 = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_new_arrival', false)
    .gt('stock_quantity', 0)
    .gte('created_at', h72)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []) as Product[]
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

export async function getFeaturedProducts(limit = 6) {
  const excludeIds = await getActiveSaleExcludeIds()

  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
  }

  const { data, error } = await query
  if (error) throw error
  return data as Product[]
}

export async function getBestsellerProducts(limit = 6) {
  const { data: scored } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .gt('best_seller_score', 0)
    .order('best_seller_score', { ascending: false })
    .limit(limit)

  if (scored && scored.length > 0) return scored as Product[]

  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .eq('is_bestseller', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as Product[]
}

export async function getLastChanceProducts(limit = 4) {
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .lte('stock_quantity', 3)
    .order('stock_quantity', { ascending: true })
    .limit(limit)
  return (data || []) as Product[]
}

export async function getTrendingProducts(limit = 4) {
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .or('trending_score.gt.0,is_trending.eq.true')
    .order('trending_score', { ascending: false })
    .limit(limit)

  return (data || []) as Product[]
}
