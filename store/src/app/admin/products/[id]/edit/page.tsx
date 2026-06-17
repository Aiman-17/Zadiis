import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/server'
import EditProductForm from './EditProductForm'
import type { Product, Category } from '@/types'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let product: Product | null = null
  let categories: Category[] = []

  try {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabaseAdmin.from('products').select('*').eq('id', id).single(),
      supabaseAdmin.from('categories').select('id, name, slug, is_active').eq('is_active', true),
    ])
    product = p as Product
    categories = (c || []) as Category[]
  } catch {}

  if (!product) notFound()

  return <EditProductForm product={product} categories={categories} />
}
