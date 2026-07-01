import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import type { Sale, Order, OrderItem } from '@/types'

function fmtSaleDate(d: string | null) {
  if (!d) return null
  return new Date(d).toLocaleDateString('en-PK', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

async function getSaleRevenue(saleIds: string[]): Promise<Record<string, { revenue: number; orders: number }>> {
  if (saleIds.length === 0) return {}

  // Fetch all sale_products to know which product_ids belong to each sale
  const { data: saleProducts } = await supabaseAdmin
    .from('sale_products')
    .select('sale_id, product_id')
    .in('sale_id', saleIds)

  // Fetch all is_sale orders (not cancelled/returned)
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, items, total')
    .eq('is_sale', true)
    .not('order_status', 'in', '("cancelled","returned")')

  const result: Record<string, { revenue: number; orders: number }> = {}
  for (const id of saleIds) result[id] = { revenue: 0, orders: 0 }

  if (!saleProducts || !orders) return result

  const productToSale: Record<string, string> = {}
  for (const sp of saleProducts) productToSale[sp.product_id] = sp.sale_id

  for (const order of orders as Order[]) {
    const items = (order.items || []) as OrderItem[]
    // Accumulate per-sale revenue from only the items that belong to each sale
    const saleRevById: Record<string, number> = {}
    for (const item of items) {
      const sid = productToSale[item.product_id]
      if (sid && saleIds.includes(sid)) {
        saleRevById[sid] = (saleRevById[sid] || 0) + item.price * item.quantity
      }
    }
    for (const [sid, rev] of Object.entries(saleRevById)) {
      result[sid].revenue += rev
      result[sid].orders++
    }
  }

  return result
}

export default async function AdminSalesPage() {
  const { data: sales } = await supabaseAdmin
    .from('sales')
    .select('*')
    .order('created_at', { ascending: false })

  let allSales = (sales as Sale[] ?? [])

  // Lazy deactivation: expire any active sale past its ends_at so this page
  // shows the correct status without waiting for the nightly cron
  const now = new Date()
  const expiredIds = allSales
    .filter(s => s.is_active && s.ends_at && new Date(s.ends_at) < now)
    .map(s => s.id)
  if (expiredIds.length > 0) {
    void supabaseAdmin.from('sales').update({ is_active: false }).in('id', expiredIds)
    allSales = allSales.map(s => expiredIds.includes(s.id) ? { ...s, is_active: false } : s)
  }

  const revenueMap = await getSaleRevenue(allSales.map(s => s.id))

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl" style={{ fontFamily: 'Playfair Display, serif' }}>Sales</h1>
        <Button asChild className="text-white rounded-none" style={{ backgroundColor: '#1C1C1C' }}>
          <Link href="/admin/sales/new">+ New Sale</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {allSales.map(sale => {
          const rev = revenueMap[sale.id]
          const isCompleted = !sale.is_active && sale.ends_at != null && new Date(sale.ends_at) < new Date()
          const statusLabel = sale.is_active ? 'Running' : isCompleted ? 'Completed' : 'Inactive'
          const statusIcon  = sale.is_active ? '🟢' : isCompleted ? '✅' : '⚫'
          return (
            <div key={sale.id} className="flex items-center justify-between p-4 bg-white border rounded-lg"
              style={{ borderColor: sale.is_active ? '#A68B6E' : '#E8DDD4' }}>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium">{sale.title}</p>
                  {sale.is_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#DCFCE7', color: '#166534' }}>Active</span>
                  )}
                  {isCompleted && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>Completed</span>
                  )}
                </div>
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  {statusIcon} {statusLabel}
                  {sale.delivery_charge_override != null && ` · Delivery override: PKR ${sale.delivery_charge_override}`}
                  {rev && rev.orders > 0 && (
                    <span className="ml-2 font-medium" style={{ color: '#1C1C1C' }}>
                      · PKR {rev.revenue.toLocaleString('en-US')} · {rev.orders} order{rev.orders !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
                {(sale.starts_at || sale.ends_at) && (
                  <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                    {fmtSaleDate(sale.starts_at) ?? '—'} → {fmtSaleDate(sale.ends_at) ?? 'No end date'}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {(rev?.orders ?? 0) > 0 && (
                  <Button asChild variant="outline" size="sm" className="rounded-none text-xs"
                    style={{ borderColor: '#A68B6E', color: '#A68B6E' }}>
                    <Link href={`/admin/sales/${sale.id}/analytics`}>Analytics</Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm" className="rounded-none">
                  <Link href={`/admin/sales/${sale.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </div>
          )
        })}
        {allSales.length === 0 && (
          <p className="text-sm" style={{ color: '#9CA3AF' }}>No sales yet. Create one to get started.</p>
        )}
      </div>
    </div>
  )
}
