import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const includeArchived = req.nextUrl.searchParams.get('includeArchived') === 'true'

    let query = supabaseAdmin
      .from('admin_notifications')
      .select('id, type, order_id, message, created_at, read_at, archived_at, orders(order_number)')
      .order('created_at', { ascending: false })
    if (!includeArchived) query = query.is('archived_at', null)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const notifications = (data || []).map((n) => ({
      id: n.id,
      type: n.type,
      order_id: n.order_id,
      order_number: (n.orders as unknown as { order_number: string } | null)?.order_number ?? null,
      message: n.message,
      created_at: n.created_at,
      read_at: n.read_at,
      archived_at: n.archived_at,
    }))

    const { count: unreadCount } = await supabaseAdmin
      .from('admin_notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
      .is('archived_at', null)

    return NextResponse.json({ notifications, unreadCount: unreadCount || 0 })
  } catch {
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, all } = await req.json()
    if (all) {
      const { error } = await supabaseAdmin
        .from('admin_notifications')
        .update({ read_at: new Date().toISOString() })
        .is('read_at', null)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, action } = await req.json()
    if (!id || !['archive', 'restore'].includes(action)) {
      return NextResponse.json({ error: 'id and a valid action required' }, { status: 400 })
    }
    const { error } = await supabaseAdmin
      .from('admin_notifications')
      .update({ archived_at: action === 'archive' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    const { error } = await supabaseAdmin.from('admin_notifications').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
