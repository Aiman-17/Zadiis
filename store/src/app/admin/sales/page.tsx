import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Sale } from '@/types'

export default async function AdminSalesPage() {
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Sales</h1>
        <Button asChild className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/admin/sales/new">+ New Sale</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {(sales as Sale[] ?? []).map(sale => (
          <div key={sale.id} className="flex items-center justify-between p-4 bg-white border rounded-lg" style={{ borderColor: '#E8DDD4' }}>
            <div>
              <p className="font-medium">{sale.title}</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>
                {sale.is_active ? '🟢 Active' : '⚫ Inactive'}
                {sale.delivery_charge_override != null && ` · Delivery override: PKR ${sale.delivery_charge_override}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-none">
                <Link href={`/admin/sales/${sale.id}/edit`}>Edit</Link>
              </Button>
            </div>
          </div>
        ))}
        {(!sales || sales.length === 0) && (
          <p className="text-gray-400 text-sm">No sales yet. Create one to get started.</p>
        )}
      </div>
    </div>
  )
}
