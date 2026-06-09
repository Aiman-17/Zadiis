import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Product } from '@/types'

export default async function AdminProducts() {
  let products: Product[] = []
  try {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
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
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50" style={{ borderColor: '#E8DDD4' }}>
            <tr>
              <th className="text-left p-4 font-medium">Name</th>
              <th className="text-left p-4 font-medium">Price</th>
              <th className="text-left p-4 font-medium">Stock</th>
              <th className="text-left p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-400">No products yet. Add your first product.</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                <td className="p-4 font-medium">{p.name}</td>
                <td className="p-4">PKR {p.price.toLocaleString()}</td>
                <td className="p-4">{p.stock_quantity}</td>
                <td className="p-4">
                  <Link href={`/admin/products/${p.id}`} style={{ color: '#A68B6E' }} className="hover:underline text-sm">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
