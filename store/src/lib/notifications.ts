import { supabaseAdmin } from '@/lib/supabase/server'

export type AdminNotificationType =
  | 'payment_received'
  | 'cancellation_request'
  | 'return_request'
  | 'exchange_request'

// Single write path for every admin_notifications insert — keeps the four
// event types symmetric and the insert logic in one place instead of
// duplicated across the seven call sites that trigger it (spec 004, US1).
export async function notifyAdmin(type: AdminNotificationType, orderId: string | null, message: string) {
  const { error } = await supabaseAdmin.from('admin_notifications').insert({
    type,
    order_id: orderId,
    message,
  })
  if (error) console.error('[notifyAdmin] insert failed:', error.message)
}
