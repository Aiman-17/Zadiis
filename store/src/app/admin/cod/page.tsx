import CodClient from '@/components/admin/CodClient'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function CodPage() {
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_phone, city, total, order_status, cod_status, cod_collected_at, created_at')
    .eq('payment_method', 'cod')
    .neq('order_status', 'cancelled')
    .order('created_at', { ascending: false })

  const allCod = orders || []

  const totalOut      = allCod.reduce((s, o) => s + Number(o.total), 0)
  const totalReceived = allCod.filter(o => o.cod_status === 'received').reduce((s, o) => s + Number(o.total), 0)
  const totalPending  = allCod.filter(o => o.cod_status !== 'received' && o.cod_status !== 'lost' && o.order_status === 'delivered').reduce((s, o) => s + Number(o.total), 0)
  const totalLost     = allCod.filter(o => o.cod_status === 'lost').reduce((s, o) => s + Number(o.total), 0)

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>COD Reconciliation</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total COD Out',      value: totalOut,      color: '#1C1C1C' },
          { label: 'Cash Received',      value: totalReceived, color: '#15803D' },
          { label: 'Awaiting Cash',      value: totalPending,  color: '#92400E' },
          { label: 'Lost / Uncollected', value: totalLost,     color: '#DC2626' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border p-4" style={{ borderColor: '#E8DDD4' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>{card.label}</p>
            <p className="text-lg font-semibold" style={{ color: card.color }}>
              PKR {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <CodClient orders={allCod} />
    </div>
  )
}
