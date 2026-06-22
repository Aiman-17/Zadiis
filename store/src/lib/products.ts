import { supabase } from './supabase/client'
import type { Product } from '@/types'

export async function getProducts(filters?: {
  minPrice?: number
  maxPrice?: number
  size?: string
  type?: string
}) {
  let query = supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice)
  if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice)

  const { data, error } = await query
  if (error) throw error

  let products = data as Product[]

  // Client-side size filter (Supabase array contains)
  if (filters?.size) {
    products = products.filter(p => p.sizes.includes(filters.size!))
  }

  if (filters?.type === 'unstitched') {
    products = products.filter(p => p.sizes.length === 0)
  } else if (filters?.type === 'stitched') {
    products = products.filter(p => p.sizes.length > 0)
  }

  return products
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

export async function getFeaturedProducts(limit = 6) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(name, slug)')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data as Product[]
}
