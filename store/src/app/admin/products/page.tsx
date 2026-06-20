import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import ProductActions from '@/components/admin/ProductActions'
import type { Product } from '@/types'

export default async function AdminProducts() {
  let products: Product[] = []
  try {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    products = (data || []) as Product[]
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
      <div className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: '#E8DDD4' }}>
        <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
            <tr>
              <th className="text-left p-4 font-medium">Name</th>
              <th className="text-left p-4 font-medium">SKU</th>
              <th className="text-left p-4 font-medium">Price</th>
              <th className="text-left p-4 font-medium">Stock</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  No products yet.{' '}
                  <Link href="/admin/products/new" style={{ color: '#A68B6E' }} className="hover:underline">
                    Add your first product
                  </Link>
                </td>
              </tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4 text-sm text-gray-500">{p.sku || '—'}</td>
                <td className="p-4">PKR {p.price.toLocaleString()}</td>
                <td className="p-4">{p.stock_quantity}</td>
                <td className="p-4">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={
                      p.is_active
                        ? { backgroundColor: '#DCFCE7', color: '#166534' }
                        : { backgroundColor: '#F3F4F6', color: '#6B7280' }
                    }
                  >
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="p-4">
                  <ProductActions id={p.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
