'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, CreditCard, FileText, Tag, BarChart2 } from 'lucide-react'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newOrders, setNewOrders] = useState(0)
  const lastCountRef = useRef<number | null>(null)

  const NAV = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, badge: 0 },
    { href: '/admin/products', icon: Package, label: 'Products', exact: false, badge: 0 },
    { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false, badge: newOrders },
    { href: '/admin/payments', icon: CreditCard, label: 'Payments', exact: false, badge: 0 },
    { href: '/admin/invoices', icon: FileText, label: 'Invoices', exact: false, badge: 0 },
    { href: '/admin/sales', icon: Tag, label: 'Sales', exact: false, badge: 0 },
    { href: '/admin/analytics', icon: BarChart2, label: 'Analytics', exact: false, badge: 0 },
    { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false, badge: 0 },
  ]

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/admin/orders')
        if (!res.ok) return
        const data = await res.json()
        const count = Array.isArray(data)
          ? data.filter((o: { order_status: string }) => o.order_status === 'new').length
          : 0
        if (lastCountRef.current === null) {
          lastCountRef.current = count
        } else if (count > lastCountRef.current) {
          setNewOrders(count - lastCountRef.current)
          lastCountRef.current = count
        }
      } catch {
        // network error — ignore
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [])

  const clearNotifications = () => {
    setNewOrders(0)
    lastCountRef.current = null
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const NavContent = () => (
    <>
      {NAV.map(({ href, icon: Icon, label, exact, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={() => { setOpen(false); if (href === '/admin/orders') clearNotifications() }}
          className="flex items-center gap-3 px-2 py-2.5 rounded text-sm transition-colors"
          style={
            isActive(href, exact)
              ? { backgroundColor: '#A68B6E', color: 'white' }
              : { color: 'rgba(255,255,255,0.7)' }
          }
        >
          <Icon size={16} />
          {label}
          {badge > 0 && (
            <span
              className="ml-auto text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
              style={{ backgroundColor: '#EF4444', color: 'white' }}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </Link>
      ))}
      <div className="flex-1" />
      <button
        onClick={logout}
        className="flex items-center gap-3 px-2 py-2.5 rounded text-sm hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <LogOut size={16} />Logout
      </button>
    </>
  )

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 shrink-0 flex-col py-6 px-4 gap-1" style={{ backgroundColor: '#1C1C1C' }}>
        <h2 className="text-lg px-2 mb-6 text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
        <NavContent />
      </aside>

      {/* Mobile overlay drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col py-6 px-4 gap-1 z-50"
            style={{ backgroundColor: '#1C1C1C' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-lg text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <NavContent />
          </aside>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          <h2 className="text-base text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
          <div className="flex items-center gap-3">
            {newOrders > 0 && (
              <span className="text-xs rounded-full px-2 py-0.5 font-bold" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                {newOrders} new order{newOrders !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={() => setOpen(true)} className="text-white p-1">
              <Menu size={22} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
