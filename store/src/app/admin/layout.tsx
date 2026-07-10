'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut, Menu, X, CreditCard, FileText, Tag, BarChart2, DollarSign, Bell, Moon, Sun, ChevronLeft } from 'lucide-react'
import { useAdminDarkMode, setAdminDarkMode } from '@/hooks/useAdminDarkMode'
import { useSidebarCollapsed, setSidebarCollapsed } from '@/hooks/useSidebarCollapsed'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [newOrders, setNewOrders] = useState(0)
  const [pendingCod, setPendingCod] = useState(0)
  const [notifCount, setNotifCount] = useState(0)
  const darkMode = useAdminDarkMode()
  const collapsed = useSidebarCollapsed()
  const lastCountRef = useRef<number | null>(null)

  const toggleDarkMode = () => setAdminDarkMode(!darkMode)
  const toggleCollapsed = () => setSidebarCollapsed(!collapsed)

  const NAV = [
    { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true, badge: 0 },
    { href: '/admin/products', icon: Package, label: 'Products', exact: false, badge: 0 },
    { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false, badge: newOrders },
    { href: '/admin/payments', icon: CreditCard, label: 'Payments', exact: false, badge: 0 },
    { href: '/admin/invoices', icon: FileText, label: 'Invoices', exact: false, badge: 0 },
    { href: '/admin/sales', icon: Tag, label: 'Sales', exact: false, badge: 0 },
    { href: '/admin/analytics', icon: BarChart2, label: 'Analytics', exact: false, badge: 0 },
    { href: '/admin/cod', icon: DollarSign, label: 'COD', exact: false, badge: 0 },
    { href: '/admin/notifications', icon: Bell, label: 'Notifications', exact: false, badge: notifCount },
    { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false, badge: 0 },
  ]

  useEffect(() => {
    if (pathname === '/admin/login') return
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
        // COD badge — all COD orders not yet cancelled or returned
        const codCount = Array.isArray(data)
          ? data.filter((o: { payment_method: string; order_status: string }) =>
              o.payment_method === 'cod' &&
              o.order_status !== 'cancelled' &&
              o.order_status !== 'returned'
            ).length
          : 0
        setPendingCod(codCount)
      } catch {
        // network error — ignore
      }

      // Notification badge — always the true current unread count (not a
      // diff-based delta like newOrders above), so a fresh page load also
      // reflects everything still outstanding.
      try {
        const notifRes = await fetch('/api/admin/notifications')
        if (notifRes.ok) {
          const notifData = await notifRes.json()
          setNotifCount(notifData.unreadCount || 0)
        }
      } catch {
        // network error — ignore
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [pathname])

  const clearNotifications = () => {
    setNewOrders(0)
    lastCountRef.current = null
  }

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    window.location.href = '/admin/login'
  }

  const NavContent = ({ iconOnly = false }: { iconOnly?: boolean }) => (
    <>
      {NAV.map(({ href, icon: Icon, label, exact, badge }) => (
        <Link
          key={href}
          href={href}
          onClick={() => { setOpen(false); if (href === '/admin/orders') clearNotifications() }}
          className="group relative flex items-center gap-3 px-2 py-2.5 rounded text-sm transition-colors"
          style={
            isActive(href, exact)
              ? { backgroundColor: '#A68B6E', color: 'white' }
              : { color: 'rgba(255,255,255,0.7)' }
          }
        >
          <Icon size={16} className="shrink-0" />
          <span className={iconOnly ? 'sr-only' : 'transition-opacity duration-150'}>{label}</span>
          {badge > 0 && (
            <span
              className={
                iconOnly
                  ? 'absolute top-1 right-1 w-2 h-2 rounded-full'
                  : 'ml-auto text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold'
              }
              style={{ backgroundColor: '#EF4444', color: 'white' }}
            >
              {iconOnly ? '' : (badge > 9 ? '9+' : badge)}
            </span>
          )}
          {iconOnly && (
            <span
              className="pointer-events-none invisible absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded px-2.5 py-1.5 text-xs opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity duration-150 z-50"
              style={{ backgroundColor: '#1C1C1C', color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
            >
              {label}
            </span>
          )}
        </Link>
      ))}
      <div className="flex-1" />
      <button
        onClick={toggleDarkMode}
        className="group relative flex items-center gap-3 px-2 py-2.5 rounded text-sm hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.7)' }}
        title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={16} className="shrink-0" /> : <Moon size={16} className="shrink-0" />}
        <span className={iconOnly ? 'sr-only' : ''}>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
      <button
        onClick={logout}
        className="group relative flex items-center gap-3 px-2 py-2.5 rounded text-sm hover:bg-white/10 transition-colors"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        <LogOut size={16} className="shrink-0" /><span className={iconOnly ? 'sr-only' : ''}>Logout</span>
      </button>
    </>
  )

  return (
    <div
      className={`flex min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)] ${darkMode ? 'dark' : ''}`}
      style={{ colorScheme: darkMode ? 'dark' : 'light' }}
    >
      {/* Desktop sidebar — sticky so it stays in view while main content scrolls.
          no-print: any admin page someone prints (invoices especially)
          should never include the nav chrome — see globals.css. */}
      <aside
        className={`no-print hidden md:flex ${collapsed ? 'w-[72px] px-3' : 'w-56 px-4'} shrink-0 flex-col py-6 gap-1 sticky top-0 h-screen overflow-y-auto transition-[width,padding] duration-200 ease-out`}
        style={{ backgroundColor: '#1C1C1C' }}
      >
        <div className="flex items-center justify-between mb-6 px-2 min-h-[28px]">
          <h2
            className={`text-lg text-white whitespace-nowrap overflow-hidden transition-opacity duration-150 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'}`}
            style={{ fontFamily: 'Playfair Display, serif' }}
          >
            ZADII&apos;S Admin
          </h2>
          <button
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className="shrink-0 w-[26px] h-[26px] rounded flex items-center justify-center transition-colors hover:bg-white/10"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            <ChevronLeft size={14} className={`transition-transform duration-200 ease-out ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <NavContent iconOnly={collapsed} />
      </aside>

      {/* Mobile overlay drawer */}
      {open && (
        <div className="no-print md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="absolute left-0 top-0 h-full w-64 flex flex-col py-6 px-4 gap-1 z-50"
            style={{ backgroundColor: '#1C1C1C' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6 px-2">
              <h2 className="text-lg text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADII&apos;S Admin</h2>
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
          className="no-print md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{ backgroundColor: '#1C1C1C' }}
        >
          <h2 className="text-base text-white" style={{ fontFamily: 'Playfair Display, serif' }}>ZADII&apos;S Admin</h2>
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
