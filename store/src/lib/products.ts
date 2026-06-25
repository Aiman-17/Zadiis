import { supabase } from './supabase/client'
import type { Product } from '@/types'

async function getActiveSaleExcludeIds(): Promise<string[]> {
  const { data: sale } = await supabase
    .from('sales')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()
  if (!sale) return []
  const { data: sps } = await supabase
    .from('sale_products')
    .select('product_id')
    .eq('sale_id', sale.id)
  return (sps || []).map((sp: { product_id: string }) => sp.product_id)
}

export async function getProducts(filters?: {
  minPrice?: number
  maxPrice?: number
  size?: string
  type?: string
}) {
  const excludeIds = await getActiveSaleExcludeIds()

  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`)
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
  const d7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .gte('created_at', d7)
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
    .gt('trending_score', 0)
    .order('trending_score', { ascending: false })
    .limit(limit)

  return (data || []) as Product[]
}
