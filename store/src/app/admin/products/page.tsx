import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import AdminProductsClient from '@/components/admin/AdminProductsClient'
import type { Product } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminProducts() {
  let activeProducts: Product[] = []
  let archivedProducts: Product[] = []
  let waitlistCounts: Record<string, number> = {}

  try {
    const [productsRes, waitlistRes] = await Promise.all([
      supabaseAdmin.from('products').select('*').order('created_at', { ascending: false }),
      supabaseAdmin.from('product_waitlist').select('product_id').is('notified_at', null),
    ])

    const all = (productsRes.data || []) as Product[]
    activeProducts = all.filter(p => p.is_active)
    archivedProducts = all.filter(p => !p.is_active)

    for (const entry of (waitlistRes.data || [])) {
      const pid = (entry as { product_id: string }).product_id
      waitlistCounts[pid] = (waitlistCounts[pid] || 0) + 1
    }
  } catch {
    // Supabase not configured
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Products</h1>
        <Button asChild className="text-white rounded-none gap-1" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/admin/products/new"><Plus size={16} />Add Product</Link>
        </Button>
      </div>
      <AdminProductsClient
        activeProducts={activeProducts}
        archivedProducts={archivedProducts}
        waitlistCounts={waitlistCounts}
      />
    </div>
  )
}
