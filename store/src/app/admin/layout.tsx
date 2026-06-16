'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Package, ShoppingBag, Settings, LogOut } from 'lucide-react'

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { href: '/admin/products', icon: Package, label: 'Products', exact: false },
  { href: '/admin/orders', icon: ShoppingBag, label: 'Orders', exact: false },
  { href: '/admin/settings', icon: Settings, label: 'Settings', exact: false },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const logout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 flex flex-col py-6 px-4 gap-1" style={{ backgroundColor: '#1C1C1C', color: 'white' }}>
        <h2 className="text-lg px-2 mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>ZADIIS Admin</h2>
        {NAV.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-2 py-2 rounded text-sm transition-colors"
            style={
              isActive(href, exact)
                ? { backgroundColor: '#A68B6E', color: 'white' }
                : { color: 'rgba(255,255,255,0.7)' }
            }
          >
            <Icon size={16} />{label}
          </Link>
        ))}
        <div className="flex-1" />
        <button
          onClick={logout}
          className="flex items-center gap-3 px-2 py-2 rounded text-sm hover:bg-white/10 transition-colors mt-2"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          <LogOut size={16} />Logout
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}
