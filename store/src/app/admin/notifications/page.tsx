import { supabaseAdmin } from '@/lib/supabase/server'
import NotificationsClient from '@/components/admin/NotificationsClient'
import type { AdminNotification } from '@/types'

export const dynamic = 'force-dynamic'

export default async function AdminNotifications() {
  let notifications: AdminNotification[] = []

  try {
    const { data } = await supabaseAdmin
      .from('admin_notifications')
      .select('id, type, order_id, message, created_at, read_at, archived_at, orders(order_number)')
      .is('archived_at', null)
      .order('created_at', { ascending: false })

    notifications = (data || []).map((n) => ({
      id: n.id,
      type: n.type,
      order_id: n.order_id,
      order_number: (n.orders as unknown as { order_number: string } | null)?.order_number ?? null,
      message: n.message,
      created_at: n.created_at,
      read_at: n.read_at,
      archived_at: n.archived_at,
    })) as AdminNotification[]
  } catch {
    // Supabase not configured
  }

  return (
    <div>
      <h1 className="text-2xl mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>Notifications</h1>
      <NotificationsClient initialNotifications={notifications} />
    </div>
  )
}
